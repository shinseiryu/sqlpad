import assert from 'assert';
import net from 'net';
import testUtils from '../test-utils.js';
import postgres from './index.js';

const connection = {
  name: 'test postgres',
  driver: 'postgres',
  host: 'localhost',
  database: 'sqlpad',
  username: 'sqlpad',
  password: 'sqlpad',
  maxRows: 100,
};

/**
 * Minimal SOCKS5 proxy (RFC 1928, CONNECT only; RFC 1929 user/password auth)
 * for testing the useSocks option without external services.
 * @param {{username?: string, password?: string}} [auth]
 */
async function startSocksProxy({ username, password } = {}) {
  let connections = 0;
  const server = net.createServer((client) => {
    client.on('error', () => {});
    client.once('data', (greeting) => {
      // VER, NMETHODS, METHODS
      const methods = [...greeting.subarray(2, 2 + greeting[1])];
      const method = username ? 0x02 : 0x00;
      if (!methods.includes(method)) {
        client.end(Buffer.from([5, 0xff]));
        return;
      }
      client.write(Buffer.from([5, method]));

      const handleConnect = () =>
        client.once('data', (req) => {
          // VER, CMD, RSV, ATYP, DST.ADDR, DST.PORT
          let host;
          let offset;
          if (req[3] === 1) {
            host = [...req.subarray(4, 8)].join('.');
            offset = 8;
          } else if (req[3] === 3) {
            host = req.subarray(5, 5 + req[4]).toString();
            offset = 5 + req[4];
          } else {
            client.end(Buffer.from([5, 8, 0, 1, 0, 0, 0, 0, 0, 0]));
            return;
          }
          const port = req.readUInt16BE(offset);
          const upstream = net.connect(port, host, () => {
            connections++;
            client.write(Buffer.from([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]));
            client.pipe(upstream);
            upstream.pipe(client);
          });
          upstream.on('error', () => client.destroy());
          client.on('close', () => upstream.destroy());
        });

      if (!username) {
        handleConnect();
        return;
      }
      client.once('data', (auth) => {
        // VER, ULEN, UNAME, PLEN, PASSWD
        const ulen = auth[1];
        const u = auth.subarray(2, 2 + ulen).toString();
        const plen = auth[2 + ulen];
        const p = auth.subarray(3 + ulen, 3 + ulen + plen).toString();
        const ok = u === username && p === password;
        client.write(Buffer.from([1, ok ? 0 : 1]));
        if (!ok) {
          client.end();
          return;
        }
        handleConnect();
      });
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    port: server.address().port,
    connections: () => connections,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

describe('drivers/postgres', function () {
  // I'm unable to use the test.sh script that stands up the docker-compose prior to running tests
  // Instead I'm running postgres, and running mocha directly
  // which means the table created for testing needs to be cleared out each run, but won't exist the first time
  before(async function () {
    await postgres.runQuery('DROP TABLE IF EXISTS sqlpad_test;', connection);
    await postgres.runQuery(
      'CREATE TABLE sqlpad_test (id INT, name TEXT);',
      connection,
    );
  });

  it('tests connection', function () {
    return postgres.testConnection(connection);
  });

  it('getSchema()', function () {
    return postgres.getSchema(connection).then((schemaInfo) => {
      testUtils.hasColumnDataType(
        schemaInfo,
        'public',
        'sqlpad_test',
        'id',
        'int4',
      );
    });
  });

  it('runQuery under limit', function () {
    return postgres
      .runQuery('SELECT * FROM generate_series(1, 10) gs;', connection)
      .then((results) => {
        assert(!results.incomplete, 'not incomplete');
        assert.equal(results.rows.length, 10, 'row length');
      });
  });

  it('runQuery over limit', function () {
    return postgres
      .runQuery('SELECT * FROM generate_series(1, 9000) gs;', connection)
      .then((results) => {
        assert(results.incomplete, 'incomplete');
        assert.equal(results.rows.length, 100, 'row length');
      });
  });

  it('Client cannot connect more than once', async function () {
    const client = new postgres.Client(connection);
    await client.connect();
    await assert.rejects(client.connect());
    await client.disconnect();
  });

  it('Client handles multiple disconnects', async function () {
    const client = new postgres.Client(connection);
    await client.connect();
    await client.disconnect();
    await client.disconnect();
  });

  it('Client handles multiple runQuery calls', async function () {
    const client = new postgres.Client(connection);
    await client.connect();

    const results1 = await client.runQuery(
      'SELECT * FROM generate_series(1, 10) g1',
    );
    assert.equal(results1.incomplete, false);
    assert.equal(results1.rows.length, 10);
    const results2 = await client.runQuery(
      'SELECT * FROM generate_series(1, 10) g1',
    );
    assert.equal(results2.incomplete, false);
    assert.equal(results2.rows.length, 10);

    await client.disconnect();
  });

  it('Throws helpful error', async function () {
    let error;
    try {
      await postgres.runQuery('SELECT * FROM fake_table', connection);
    } catch (e) {
      error = e;
    }
    assert(error);
    assert(
      error.message.includes('fake_table'),
      'Error message has table reference',
    );
  });
  describe('SOCKS proxy', function () {
    it('connects through SOCKS5 proxy without auth', async function () {
      const proxy = await startSocksProxy();
      try {
        const results = await postgres.runQuery('SELECT 1 AS one;', {
          ...connection,
          useSocks: true,
          socksHost: '127.0.0.1',
          socksPort: String(proxy.port),
        });
        assert.equal(results.rows[0].one, 1);
        assert.equal(proxy.connections(), 1, 'went through proxy');
      } finally {
        await proxy.close();
      }
    });

    it('connects through SOCKS5 proxy with username/password', async function () {
      const proxy = await startSocksProxy({
        username: 'proxyuser',
        password: 'proxypass',
      });
      try {
        await postgres.testConnection({
          ...connection,
          useSocks: true,
          socksHost: '127.0.0.1',
          socksPort: String(proxy.port),
          socksUsername: 'proxyuser',
          socksPassword: 'proxypass',
        });
        assert.equal(proxy.connections(), 1, 'went through proxy');
      } finally {
        await proxy.close();
      }
    });

    it('fails with wrong proxy credentials', async function () {
      const proxy = await startSocksProxy({
        username: 'proxyuser',
        password: 'proxypass',
      });
      try {
        await assert.rejects(
          postgres.testConnection({
            ...connection,
            useSocks: true,
            socksHost: '127.0.0.1',
            socksPort: String(proxy.port),
            socksUsername: 'proxyuser',
            socksPassword: 'wrong',
          }),
        );
        assert.equal(proxy.connections(), 0);
      } finally {
        await proxy.close();
      }
    });
  });
});
