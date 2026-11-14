import { Client, InvalidCredentialsError, NoSuchObjectError } from 'ldapts';
import appLog from './app-log.js';

const CONNECT_TIMEOUT_MS = 10000;
const OPERATION_TIMEOUT_MS = 30000;

/**
 * Create ldap client
 * @param {import('./config/index').default} config
 */
function getClient(config) {
  return new Client({
    url: config.get('ldapUrl'),
    connectTimeout: CONNECT_TIMEOUT_MS,
    timeout: OPERATION_TIMEOUT_MS,
  });
}

/**
 * Bind client with DN and password
 * @param {Client} client
 * @param {string} bindDN
 * @param {string} ldapPassword
 */
async function bindClient(client, bindDN, ldapPassword) {
  appLog.trace(`LDAP bind to ${bindDN}`);
  try {
    await client.bind(bindDN, ldapPassword);
  } catch (error) {
    appLog.trace(error, 'LDAP bind error');
    throw error;
  }
  appLog.trace('LDAP bind success');
}

/**
 * Unbind client, ignoring errors (e.g. if never connected)
 * @param {Client} client
 */
async function unbindClient(client) {
  try {
    await client.unbind();
  } catch {
    // ignore
  }
}

/**
 * Tries to bind and returns boolean.
 * Connection is immediately closed.
 * @param {import('./config/index').default} config
 */
async function ldapCanBind(config) {
  if (!config.get('ldapAuthEnabled')) {
    return;
  }

  const client = getClient(config);
  try {
    await bindClient(
      client,
      config.get('ldapBindDN'),
      config.get('ldapPassword'),
    );
    return true;
  } catch (error) {
    appLog.error(error, 'Error binding ldap');
    return false;
  } finally {
    await unbindClient(client);
  }
}

/**
 * Query ldap and get an array of entries.
 * If nothing found empty array is returned
 * @param {Client} client
 * @param {string} searchBase
 * @param {'base'|'one'|'sub'} scope
 * @param {string} filter - ldap filter string
 * @returns {Promise<object[]>}
 */
async function queryLdap(client, searchBase, scope, filter) {
  appLog.debug(
    { scope, filter },
    `Running LDAP search with searchBase ${searchBase}`,
  );
  try {
    const { searchEntries } = await client.search(searchBase, {
      scope,
      filter,
    });
    return searchEntries;
  } catch (error) {
    if (error instanceof NoSuchObjectError) {
      return [];
    }
    throw error;
  }
}

/**
 * Escape a value for use inside an LDAP search filter (RFC 4515)
 * @param {string} value
 */
function escapeFilterValue(value) {
  return String(value).replace(
    /[\\*()\0]/g,
    (c) => `\\${c.charCodeAt(0).toString(16).padStart(2, '0')}`,
  );
}

/**
 * Authenticate a user against LDAP.
 *
 * Binds with the configured service account, finds the user with
 * `ldapSearchFilter` (`{{username}}` is replaced with the escaped username),
 * then binds as that user to verify the password.
 *
 * Returns the user's LDAP entry, or null if the user was not found or the
 * credentials are invalid. Other errors (e.g. server unreachable) are thrown.
 * @param {import('./config/index').default} config
 * @param {string} username
 * @param {string} password
 * @returns {Promise<object|null>}
 */
async function authenticate(config, username, password) {
  // An empty password would be an unauthenticated bind, which many servers accept
  if (!username || !password) {
    return null;
  }

  const filter = config
    .get('ldapSearchFilter')
    .replace(/{{username}}/g, escapeFilterValue(username));

  let entries;
  const searchClient = getClient(config);
  try {
    const bindDN = config.get('ldapBindDN');
    if (bindDN) {
      await bindClient(searchClient, bindDN, config.get('ldapPassword'));
    }
    entries = await queryLdap(
      searchClient,
      config.get('ldapSearchBase'),
      'sub',
      filter,
    );
  } finally {
    await unbindClient(searchClient);
  }

  if (entries.length === 0) {
    appLog.debug(`No LDAP entry found for ${username}`);
    return null;
  }
  if (entries.length > 1) {
    appLog.warn(
      `LDAP search for ${username} returned ${entries.length} entries. Refine SQLPAD_LDAP_SEARCH_FILTER so it matches one entry.`,
    );
    return null;
  }

  const [entry] = entries;
  const userClient = getClient(config);
  try {
    await bindClient(userClient, entry.dn, password);
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      return null;
    }
    throw error;
  } finally {
    await unbindClient(userClient);
  }

  return entry;
}

export default {
  authenticate,
  bindClient,
  unbindClient,
  escapeFilterValue,
  ldapCanBind,
  queryLdap,
  getClient,
};
