import assert from 'assert';
import TestUtils from '../utils.js';

describe('api/drivers', function () {
  const utils = new TestUtils();

  before(function () {
    return utils.init(true);
  });

  it('gets drivers', async function () {
    const drivers = await utils.get('editor', '/api/drivers');

    const postgres = drivers.find((i) => i.id === 'postgres');
    assert(postgres, 'has postgres');
    assert.strictEqual(postgres.name, 'Postgres');
    assert.strictEqual(postgres.supportsConnectionClient, true);
    assert(Array.isArray(postgres.fields));
    assert(
      postgres.fields.find((field) => field.key === 'postgresSsl'),
      'has postgres specific field'
    );
    assert(
      !postgres.fields.find((field) => field.key === 'sqlserverEncrypt'),
      'Does not have a SQL Server field'
    );

    const mysql2 = drivers.find((i) => i.id === 'mysql2');
    assert(mysql2);
    assert.strictEqual(mysql2.supportsConnectionClient, true);

    // Removed drivers must not be listed
    for (const id of [
      'athena',
      'cassandra',
      'crate',
      'mysql',
      'unixodbc',
      'vertica',
    ]) {
      assert(!drivers.find((i) => i.id === id), `${id} not listed`);
    }
  });
});
