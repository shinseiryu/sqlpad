import { createClient } from 'redis';
import appLog from './app-log.js';

/**
 * Creates and connects a redis client.
 *
 * An 'error' listener is always attached. Without one, node-redis emits an
 * unhandled 'error' event when the connection drops (e.g. redis restarts),
 * which crashes the process. With it, the client logs and keeps reconnecting.
 *
 * @param {string} url - redis URI
 * @param {string} purpose - used in log messages, e.g. "session store"
 */
export default function createRedisClient(url, purpose) {
  const client = createClient({ url });

  // Log the first error of an outage only; node-redis retries and emits an
  // error per attempt, which would flood the log while redis is down
  let inOutage = false;
  client.on('error', (error) => {
    if (!inOutage) {
      inOutage = true;
      appLog.error(error, `Redis ${purpose} client error. Reconnecting...`);
    }
  });
  client.on('ready', () => {
    if (inOutage) {
      inOutage = false;
      appLog.info(`Redis ${purpose} client reconnected`);
    }
  });

  client.connect().catch(() => {
    // Connection errors are reported through the 'error' listener
  });
  return client;
}
