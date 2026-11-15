import assert from 'assert';
import net from 'net';
import TestUtils from '../utils.js';
import createRedisClient from '../../lib/redis-client.js';

/**
 * TCP proxy in front of the local test redis so the connection can be dropped
 */
async function startProxy(port) {
  const sockets = new Set();
  const server = net.createServer((client) => {
    const upstream = net.connect(6379, '127.0.0.1');
    client.pipe(upstream).pipe(client);
    for (const s of [client, upstream]) {
      sockets.add(s);
      s.on('error', () => {});
      s.on('close', () => sockets.delete(s));
    }
  });
  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve));
  return {
    async stop() {
      for (const s of sockets) {
        s.destroy();
      }
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

function waitFor(predicate, timeoutMs = 10000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      if (predicate()) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(timer);
        reject(new Error('timed out'));
      }
    }, 25);
  });
}

describe('lib/redis-client', function () {
  before(async function () {
    const available = await TestUtils.redisAvailable('redis://localhost:6379');
    if (!available || process.env.SKIP_INTEGRATION === 'true') {
      return this.skip();
    }
  });

  it('survives a dropped connection and reconnects', async function () {
    const port = 6399;
    let proxy = await startProxy(port);
    const client = createRedisClient(`redis://127.0.0.1:${port}`, 'test');
    try {
      await waitFor(() => client.isReady);
      assert.equal(await client.ping(), 'PONG');

      // Without an 'error' listener this drop would throw an unhandled error event
      await proxy.stop();
      await waitFor(() => !client.isReady);

      proxy = await startProxy(port);
      await waitFor(() => client.isReady);
      assert.equal(await client.ping(), 'PONG');
    } finally {
      client.destroy();
      await proxy.stop();
    }
  });
});
