import assert from 'assert';
import request from 'supertest';
import { createClient } from 'redis';
import TestUtils from '../utils.js';

async function testSessionStore(sessionStore, additionalOpts = {}) {
  const utils = new TestUtils({
    authProxyEnabled: true,
    authProxyAutoSignUp: true,
    authProxyDefaultRole: 'admin',
    authProxyHeaders: 'email:X-WEBAUTH-EMAIL',
    sessionStore,
    ...additionalOpts,
  });
  await utils.init();

  const agent = request.agent(utils.app);

  // This signin call authenticates, auto-creates the user and creates a session
  await agent
    .post('/api/signin')
    .set('X-WEBAUTH-EMAIL', 'test@sqlpad.com')
    .expect(200);

  // agent should have session cookie to allow further action
  const r2 = await agent.get('/api/app');
  assert.equal(r2.body.currentUser.email, 'test@sqlpad.com');
}

describe('auth/session-stores', function () {
  it('file', async function () {
    return testSessionStore('file');
  });

  it('memory', async function () {
    return testSessionStore('memory');
  });

  it('database', async function () {
    return testSessionStore('database');
  });

  it('redis', async function () {
    const available = await TestUtils.redisAvailable('redis://localhost:6379');
    if (!available || process.env.SKIP_INTEGRATION === 'true') {
      return this.skip();
    }
    const client = createClient({ url: 'redis://localhost:6379' });
    await client.connect();
    try {
      const before = new Set(await client.keys('sess:*'));
      await testSessionStore('redis', { redisUri: 'redis://localhost:6379' });

      // Session must be stored in redis under the connect-redis default prefix, with a TTL
      const created = (await client.keys('sess:*')).filter(
        (key) => !before.has(key),
      );
      assert.equal(created.length, 1, 'one new session key');
      const session = JSON.parse(await client.get(created[0]));
      assert(session.passport.user, 'session has passport user');
      assert((await client.ttl(created[0])) > 0, 'session key has TTL');
    } finally {
      await client.close();
    }
  });
});
