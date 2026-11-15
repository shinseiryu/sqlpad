import assert from 'assert';

import { createClient } from 'redis';
import TestUtils from '../utils.js';

const query1 = `SELECT 1 AS id, 'blue' AS color`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function testBatchToCompletion(config, checkStored) {
  const utils = new TestUtils(config);
  await utils.init(true);

  const connection = await utils.post('admin', '/api/connections', {
    name: 'test connection',
    driver: 'sqlite',
    data: {
      filename: './test/fixtures/sales.sqlite',
    },
  });

  let batch = await utils.post('admin', `/api/batches`, {
    connectionId: connection.id,
    batchText: query1,
  });
  while (batch.status !== 'finished' && batch.status !== 'error') {
    await wait(25);
    batch = await utils.get('admin', `/api/batches/${batch.id}`);
  }

  const statements = await utils.get(
    'admin',
    `/api/batches/${batch.id}/statements`,
  );

  const statement1 = statements[0];

  let result1 = await utils.get(
    'admin',
    `/api/statements/${statement1.id}/results`,
  );
  assert.deepEqual(result1, [[1, 'blue']], 'results as expected');

  if (checkStored) {
    await checkStored(statement1.id, true);
  }

  // remove should succeed
  await utils.models.statements.removeById(statement1.id);
  await utils.get('admin', `/api/statements/${statement1.id}/results`, 404);

  if (checkStored) {
    await checkStored(statement1.id, false);
  }
}

describe('api/query-result-stores', function () {
  it('file', async function () {
    return testBatchToCompletion({ queryResultStore: 'file' });
  });

  it('redis', async function () {
    const available = await TestUtils.redisAvailable('redis://localhost:6379');
    if (!available || process.env.SKIP_INTEGRATION === 'true') {
      return this.skip();
    }
    const client = createClient({ url: 'redis://localhost:6379' });
    await client.connect();
    try {
      await testBatchToCompletion(
        {
          queryResultStore: 'redis',
          redisUri: 'redis://localhost:6379',
        },
        async (statementId, shouldExist) => {
          const key = `statement-result/${statementId}`;
          if (shouldExist) {
            assert.deepEqual(JSON.parse(await client.get(key)), [[1, 'blue']]);
            assert((await client.ttl(key)) > 0, 'result key has TTL');
          } else {
            assert.equal(await client.exists(key), 0, 'result key removed');
          }
        },
      );
    } finally {
      await client.close();
    }
  });

  it('database', async function () {
    return testBatchToCompletion({
      queryResultStore: 'database',
    });
  });

  it('memory', async function () {
    return testBatchToCompletion({
      queryResultStore: 'memory',
    });
  });
});
