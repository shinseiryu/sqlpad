import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import TestUtils from '../utils.js';
import serverDirname from '../../server-dirname.cjs';

// sqlpad.sqlite created by SQLPad 7.x (umzug 2) with all migrations applied
const sourceDir = path.join(serverDirname, 'test/fixtures/v7-test-db');

async function migrationFileNames() {
  const files = await fs.readdir(path.join(serverDirname, 'migrations'));
  return files.filter((f) => /^\d+[\w-]+\.js$/.test(f)).sort();
}

async function recordedNames(utils) {
  const [rows] = await utils.sequelizeDb.sequelize.query(
    'SELECT name FROM schema_version ORDER BY name',
  );
  return rows.map((r) => r.name);
}

describe('migrations/upgrade-from-v7', function () {
  /**
   * @type {TestUtils}
   */
  let utils;

  before(async function () {
    utils = new TestUtils({
      dbPath: path.join(serverDirname, 'test/artifacts/v7-upgrade'),
      dbInMemory: false,
      // Fixture is SQLite
      backendDatabaseUri: '',
    });
    await utils.prepDbDir();
    await fs.cp(sourceDir, utils.config.get('dbPath'), { recursive: true });
    await utils.initDbs();
  });

  after(function () {
    return utils.sequelizeDb.sequelize.close();
  });

  it('Recognizes migrations recorded by umzug 2', async function () {
    assert.strictEqual(await utils.migrator.getDbMajorVersion(), 6);
    assert(await utils.migrator.schemaUpToDate());
  });

  it('Migrating is a no-op', async function () {
    const before = await recordedNames(utils);
    await utils.migrate();
    assert.deepStrictEqual(await recordedNames(utils), before);
    assert.deepStrictEqual(before, await migrationFileNames());
  });
});

describe('migrations/fresh-install', function () {
  const utils = new TestUtils();

  before(async function () {
    await utils.initDbs();
  });

  it('Records migration file names like umzug 2 did', async function () {
    await utils.migrate();
    assert.deepStrictEqual(
      await recordedNames(utils),
      await migrationFileNames(),
    );
    assert.strictEqual(await utils.migrator.getDbMajorVersion(), 6);
  });
});
