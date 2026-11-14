import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import TestUtils from '../utils.js';
import serverDirname from '../../server-dirname.cjs';

const sourceDir = path.join(
  serverDirname,
  'test/fixtures/v4.2.0-test-db/testdb',
);

describe('migrations/get-db-major-version', function () {
  /**
   * @type {TestUtils}
   */
  let utils;

  before('preps the env', async function () {
    utils = new TestUtils({
      dbPath: path.join(serverDirname, 'test/artifacts/v4-to-v5'),
      dbInMemory: false,
      // Force this test to only run with SQLite
      backendDatabaseUri: '',
    });

    const destination = utils.config.get('dbPath');

    await utils.prepDbDir();
    await fs.cp(sourceDir, destination, { recursive: true });

    await utils.initDbs();
  });

  after(function () {
    return utils.sequelizeDb.sequelize.close();
  });

  it('Before migration - major version is 4', async function () {
    const major = await utils.migrator.getDbMajorVersion();
    assert.strictEqual(major, 4);
  });

  it('Migrates', async function () {
    await utils.migrate();
  });

  it('After migration - major is 6', async function () {
    const major = await utils.migrator.getDbMajorVersion();
    assert.strictEqual(major, 6);
  });
});
