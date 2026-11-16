import assert from 'assert';
import http from 'http';
import bigquery from '../../drivers/bigquery/index.js';

const PROJECT = 'test-project';
const DATASET = 'sales';

/**
 * Minimal in-process stand-in for the BigQuery REST API.
 * The client library sends requests here when BIGQUERY_EMULATOR_HOST is set,
 * which lets the driver run against @google-cloud/bigquery without GCP
 * credentials. Query results are looked up by query text in `results`.
 */
function createMockBigQuery() {
  const mock = {
    host: '',
    server: undefined,
    jobs: new Map(),
    requests: [],
    results: new Map(),
    tables: new Map(),
  };

  function json(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  }

  // BigQuery REST returns each row as { f: [{ v }] } with values as strings
  function toApiRows(fields, rows) {
    return rows.map((row) => ({
      f: fields.map((field) => ({
        v: row[field.name] === null ? null : String(row[field.name]),
      })),
    }));
  }

  mock.server = http.createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => (body += chunk));
    req.on('end', () => {
      const url = new URL(req.url, 'http://localhost');
      mock.requests.push(`${req.method} ${url.pathname}`);
      let match;

      if (
        req.method === 'POST' &&
        url.pathname === `/projects/${PROJECT}/jobs`
      ) {
        const job = JSON.parse(body);
        mock.jobs.set(job.jobReference.jobId, job);
        return json(res, 200, {
          kind: 'bigquery#job',
          id: `${PROJECT}:${job.jobReference.jobId}`,
          jobReference: job.jobReference,
          configuration: job.configuration,
          status: { state: 'DONE' },
        });
      }

      match = url.pathname.match(
        new RegExp(`^/projects/${PROJECT}/queries/([^/]+)$`),
      );
      if (req.method === 'GET' && match) {
        const job = mock.jobs.get(match[1]);
        const result = job && mock.results.get(job.configuration.query.query);
        if (!result) {
          return json(res, 404, { error: { code: 404, message: 'No job' } });
        }
        const maxResults = parseInt(url.searchParams.get('maxResults'), 10);
        const rows = maxResults
          ? result.rows.slice(0, maxResults)
          : result.rows;
        return json(res, 200, {
          kind: 'bigquery#getQueryResultsResponse',
          jobReference: job.jobReference,
          jobComplete: true,
          schema: { fields: result.fields },
          rows: toApiRows(result.fields, rows),
          totalRows: String(result.rows.length),
        });
      }

      match = url.pathname.match(
        new RegExp(`^/projects/${PROJECT}/datasets/([^/]+)/tables/([^/]+)$`),
      );
      if (req.method === 'GET' && match) {
        const table = mock.tables.get(`${match[1]}.${match[2]}`);
        if (!table) {
          return json(res, 404, { error: { code: 404, message: 'No table' } });
        }
        return json(res, 200, table);
      }

      return json(res, 404, { error: { code: 404, message: 'Not found' } });
    });
  });

  mock.start = () =>
    new Promise((resolve) => {
      mock.server.listen(0, '127.0.0.1', () => {
        mock.host = `http://127.0.0.1:${mock.server.address().port}`;
        resolve();
      });
    });

  mock.stop = () => new Promise((resolve) => mock.server.close(resolve));

  return mock;
}

describe('drivers/bigquery (mock API)', function () {
  const mock = createMockBigQuery();
  const savedEnv = {};
  const connection = {
    name: 'test bigquery',
    driver: 'bigquery',
    projectId: PROJECT,
    datasetName: DATASET,
    datasetLocation: 'US',
    maxRows: 2,
  };

  before(async function () {
    await mock.start();
    for (const key of ['BIGQUERY_EMULATOR_HOST', 'METADATA_SERVER_DETECTION']) {
      savedEnv[key] = process.env[key];
    }
    process.env.BIGQUERY_EMULATOR_HOST = mock.host;
    // Without credentials, google-auth-library probes the GCE metadata
    // server. Skip that so the test doesn't wait on network timeouts.
    process.env.METADATA_SERVER_DETECTION = 'none';

    mock.results.set('SELECT id, name FROM orders', {
      fields: [
        { name: 'id', type: 'INTEGER' },
        { name: 'name', type: 'STRING' },
      ],
      rows: [
        { id: '9007199254740993', name: 'a' },
        { id: 2, name: 'b' },
        { id: 3, name: null },
      ],
    });
    mock.results.set(`SELECT * FROM \`${DATASET}.__TABLES__\``, {
      fields: [
        { name: 'dataset_id', type: 'STRING' },
        { name: 'table_id', type: 'STRING' },
      ],
      rows: [
        { dataset_id: DATASET, table_id: 'orders' },
        { dataset_id: DATASET, table_id: '_SEARCH_INDEX_orders' },
      ],
    });
    mock.tables.set(`${DATASET}.orders`, {
      kind: 'bigquery#table',
      tableReference: {
        projectId: PROJECT,
        datasetId: DATASET,
        tableId: 'orders',
      },
      schema: {
        fields: [
          { name: 'id', type: 'INTEGER', description: 'Order id' },
          { name: 'name', type: 'STRING' },
        ],
      },
    });
  });

  after(async function () {
    for (const [key, value] of Object.entries(savedEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    await mock.stop();
  });

  it('runQuery returns rows with integers as strings', async function () {
    const results = await bigquery.runQuery('SELECT id, name FROM orders', {
      ...connection,
      maxRows: 10,
    });
    assert.strictEqual(results.incomplete, false);
    assert.deepStrictEqual(results.rows, [
      { id: '9007199254740993', name: 'a' },
      { id: '2', name: 'b' },
      { id: '3', name: null },
    ]);
  });

  it('runQuery over maxRows is incomplete', async function () {
    const results = await bigquery.runQuery(
      'SELECT id, name FROM orders',
      connection,
    );
    assert.strictEqual(results.incomplete, true);
    assert.strictEqual(results.rows.length, 2);
  });

  it('runQuery rejects API errors', async function () {
    await assert.rejects(
      bigquery.runQuery('SELECT unknown', connection),
      /No job/,
    );
  });

  it('getSchema() reads table metadata', async function () {
    const schemaInfo = await bigquery.getSchema(connection);
    assert.strictEqual(schemaInfo.schemas.length, 1);
    const [schema] = schemaInfo.schemas;
    assert.strictEqual(schema.name, DATASET);
    assert.deepStrictEqual(
      schema.tables.map((t) => t.name),
      ['orders'],
    );
    assert.deepStrictEqual(schema.tables[0].columns, [
      { name: 'id', dataType: 'INTEGER', description: 'Order id' },
      { name: 'name', dataType: 'STRING', description: undefined },
    ]);
    // _SEARCH_INDEX_ tables are skipped
    assert(
      !mock.requests.some((r) => r.includes('_SEARCH_INDEX_')),
      'search index table metadata was requested',
    );
  });
});
