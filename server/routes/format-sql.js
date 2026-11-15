import '../typedefs.js';
import { format } from 'sql-formatter';
import mustBeAuthenticated from '../middleware/must-be-authenticated.js';
import wrap from '../lib/wrap.js';
import express from 'express';
const router = express.Router();

/**
 * Maps SQLPad driver ids to sql-formatter languages.
 * Drivers not listed use the generic 'sql' language.
 */
const LANGUAGE_BY_DRIVER = {
  bigquery: 'bigquery',
  clickhouse: 'clickhouse',
  mysql2: 'mysql',
  postgres: 'postgresql',
  presto: 'trino',
  redshift: 'redshift',
  sqlite: 'sqlite',
  sqlserver: 'transactsql',
  trino: 'trino',
};

/**
 * Determine formatter language from the connection the query is for.
 * Falls back to generic SQL when connection is not given, not found,
 * or the user does not have access to it.
 * @param {Req} req
 */
async function getLanguage(req) {
  const { models, user } = req;
  const { connectionId } = req.body;
  if (!connectionId || typeof connectionId !== 'string') {
    return 'sql';
  }
  if (user.role !== 'admin') {
    const access =
      await models.connectionAccesses.findOneActiveByConnectionIdAndUserId(
        connectionId,
        user.id,
      );
    if (!access) {
      return 'sql';
    }
  }
  const connection = await models.connections.findOneById(connectionId);
  return LANGUAGE_BY_DRIVER[connection?.driver] || 'sql';
}

/**
 * Returns formatted query in same object format it was sent
 * @param {Req} req
 * @param {Res} res
 */
async function formatSql(req, res) {
  const { query } = req.body;
  if (!query) {
    return res.utils.error('query property must be provided');
  }
  const language = await getLanguage(req);
  try {
    return res.utils.data({ query: format(query, { language }) });
  } catch (error) {
    // sql-formatter 15 parses the query and throws on syntax it does not
    // understand (sql-formatter 2 never failed). Report it as a user error.
    return res.utils.error(`Unable to format query: ${error.message}`);
  }
}

router.post('/api/format-sql', mustBeAuthenticated, wrap(formatSql));

export default router;
