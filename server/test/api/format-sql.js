import assert from 'assert';
import TestUtils from '../utils.js';

// Bracket-quoted identifiers are valid in SQLite/SQL Server but not in
// generic SQL, so this query shows which dialect was used.
const BRACKET_QUERY = 'select [a b] from t';

describe('api/format-sql', function () {
  // No default access to every connection, so editor has none
  const utils = new TestUtils({ allowConnectionAccessToEveryone: false });
  let sqliteConnection;

  before(async function () {
    await utils.init(true);
    sqliteConnection = await utils.post('admin', '/api/connections', {
      driver: 'sqlite',
      name: 'format-sql-sqlite',
      data: { filename: './test/fixtures/sales.sqlite' },
    });
  });

  it('format sql query', async function () {
    const body = await utils.post('admin', '/api/format-sql', {
      query: 'SELECT column_one, column_two FROM sometable',
    });
    assert.equal(
      body.query,
      'SELECT\n  column_one,\n  column_two\nFROM\n  sometable',
    );
  });

  it('requires query', async function () {
    const body = await utils.post('admin', '/api/format-sql', {}, 400);
    assert.equal(body.title, 'query property must be provided');
  });

  it('returns 400 for query that cannot be parsed', async function () {
    const body = await utils.post(
      'admin',
      '/api/format-sql',
      { query: BRACKET_QUERY },
      400,
    );
    assert(body.title.startsWith('Unable to format query: Parse error'));
  });

  it('uses dialect of connection', async function () {
    const body = await utils.post('admin', '/api/format-sql', {
      query: BRACKET_QUERY,
      connectionId: sqliteConnection.id,
    });
    assert.equal(body.query, 'select\n  [a b]\nfrom\n  t');
  });

  it('uses generic SQL for connection without access', async function () {
    await utils.post(
      'editor',
      '/api/format-sql',
      { query: BRACKET_QUERY, connectionId: sqliteConnection.id },
      400,
    );
  });

  it('uses generic SQL for unknown connection', async function () {
    const body = await utils.post('admin', '/api/format-sql', {
      query: 'SELECT a FROM t',
      connectionId: 'does-not-exist',
    });
    assert.equal(body.query, 'SELECT\n  a\nFROM\n  t');
  });
});
