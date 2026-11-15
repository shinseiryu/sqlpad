import path from 'path';
import { pathToFileURL } from 'url';
import { Umzug, SequelizeStorage } from 'umzug';
import serverDirname from '../server-dirname.cjs';

// Matches files like 06-00700-service-token-id-column.js
const MIGRATION_FILE_GLOB = '[0-9]*-*.js';

function makeMigrator(config, appLog, sequelizeInstance) {
  const umzug = new Umzug({
    migrations: {
      glob: [
        MIGRATION_FILE_GLOB,
        { cwd: path.join(serverDirname, 'migrations') },
      ],
      // Migration names are the file names (including .js), which is also
      // what umzug 2 recorded in schema_version, so existing databases
      // continue to be recognized.
      resolve: ({ name, path: filePath }) => {
        const getModule = () => import(pathToFileURL(filePath).href);
        return {
          name,
          up: async () =>
            (await getModule()).up(
              sequelizeInstance.getQueryInterface(),
              config,
              appLog,
              sequelizeInstance,
            ),
          down: async () =>
            (await getModule()).down?.(sequelizeInstance.getQueryInterface()),
        };
      },
    },
    storage: new SequelizeStorage({
      sequelize: sequelizeInstance,
      tableName: 'schema_version',
    }),
    logger: {
      info: (event) => {
        if (event.event === 'migrating') {
          appLog.info(`== ${event.name}: migrating =======`);
        } else if (event.event === 'migrated') {
          appLog.info(`== ${event.name}: migrated (${event.durationSeconds}s)`);
        }
      },
      warn: (message) => appLog.warn(message),
      error: (message) => appLog.error(message),
      debug: () => {},
    },
  });

  return {
    migrate() {
      return umzug.up();
    },

    async schemaUpToDate() {
      const pending = await umzug.pending();
      const upToDate = pending.length === 0;
      return upToDate;
    },

    /**
     * Returns promise containing major version of the database
     * If migrations have not yet run, 0 is returned.
     * If the version cannot be determined, -1 is returned
     */
    async getDbMajorVersion() {
      const executed = await umzug.executed();
      if (executed.length === 0) {
        return 0;
      }

      const migrationFileRegex = /\d\d-\d\d\d\d\d-(\w|-)+\.js/;

      const migrationFiles = executed
        .map((migration) => migration.name)
        .sort()
        .filter((name) => {
          // regex.test() is stateful if /g is set
          // It isn't in use now, but it was during initial dev and caused confusion
          // Using string.search() to ensure this stops functioning in case of /g being set in future
          return name.search(migrationFileRegex) > -1;
        });

      const lastMigrationFile = migrationFiles.pop();

      // Migration files have format of 'nn-nnnnn-some-text.js'
      // Those initial 2 numbers were intended on being the major version...
      // but I messed that up pretty eary on 😬
      //
      // v5 migrations = anything starting with 05, or >= 04-00200
      // 04-00200
      // ... all the way to
      // 05-00100
      // 5.0.0 release specifically included up to 04-00900 migration
      //
      // v4 migrations = 04-00000 - 04-00199
      // 04-00100
      // ... all the way to
      // 04-00129
      //
      const [majorString, minorString] = lastMigrationFile.split('-');
      const major = parseInt(majorString, 10);
      const minor = parseInt(minorString, 10);

      if (major === 4) {
        if (minor >= 200) {
          return 5;
        }
        return 4;
      }

      // Otherwise returns major as is (it'll be 5 or later)
      return major;
    },
  };
}

export default makeMigrator;
