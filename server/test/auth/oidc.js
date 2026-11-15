import assert from 'assert';
import crypto from 'crypto';
import http from 'http';
import request from 'supertest';
import TestUtil from '../utils.js';

const CLIENT_ID = 'sqlpad-client';
const CLIENT_SECRET = 'sqlpad-secret';
const PUBLIC_URL = 'http://localhost:3010';

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

/**
 * Minimal in-process OpenID Connect provider.
 * Serves discovery, JWKS and a token endpoint that issues a signed ID token
 * for whatever claims are queued via `nextClaims`.
 */
function createMockIdp() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
  });
  const jwk = { ...publicKey.export({ format: 'jwk' }), kid: 'k1', use: 'sig' };

  const idp = {
    issuer: '',
    nextClaims: {},
    lastTokenRequest: undefined,
    codes: new Map(),
    server: undefined,
  };

  function signIdToken(claims) {
    const header = base64url(
      JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'k1' }),
    );
    const now = Math.floor(Date.now() / 1000);
    const payload = base64url(
      JSON.stringify({
        iss: idp.issuer,
        aud: CLIENT_ID,
        sub: 'user-1',
        iat: now,
        exp: now + 300,
        ...claims,
      }),
    );
    const signature = crypto
      .sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), privateKey)
      .toString('base64url');
    return `${header}.${payload}.${signature}`;
  }

  function json(res, status, body) {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  }

  idp.server = http.createServer((req, res) => {
    const url = new URL(req.url, idp.issuer);
    if (url.pathname === '/.well-known/openid-configuration') {
      return json(res, 200, {
        issuer: idp.issuer,
        authorization_endpoint: `${idp.issuer}/authorize`,
        token_endpoint: `${idp.issuer}/token`,
        jwks_uri: `${idp.issuer}/jwks`,
        response_types_supported: ['code'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['client_secret_basic'],
      });
    }
    if (url.pathname === '/jwks') {
      return json(res, 200, { keys: [jwk] });
    }
    if (url.pathname === '/token' && req.method === 'POST') {
      let body = '';
      req.on('data', (chunk) => (body += chunk));
      req.on('end', () => {
        const params = new URLSearchParams(body);
        idp.lastTokenRequest = {
          authorization: req.headers.authorization,
          params,
        };
        const expected = idp.codes.get(params.get('code'));
        const verifierChallenge = crypto
          .createHash('sha256')
          .update(params.get('code_verifier') || '')
          .digest('base64url');
        // RFC 6749 2.3.1: credentials are form-urlencoded before base64
        const [basicId, basicSecret] = Buffer.from(
          (req.headers.authorization || '').replace(/^Basic /, ''),
          'base64',
        )
          .toString()
          .split(':')
          .map((v) => decodeURIComponent(v.replace(/\+/g, ' ')));
        if (
          !expected ||
          basicId !== CLIENT_ID ||
          basicSecret !== CLIENT_SECRET ||
          verifierChallenge !== expected.codeChallenge ||
          params.get('redirect_uri') !== expected.redirectUri
        ) {
          return json(res, 400, { error: 'invalid_grant' });
        }
        return json(res, 200, {
          access_token: 'access-token',
          token_type: 'Bearer',
          expires_in: 300,
          id_token: signIdToken(idp.nextClaims),
        });
      });
      return;
    }
    res.writeHead(404);
    res.end();
  });

  idp.start = () =>
    new Promise((resolve) => {
      idp.server.listen(0, '127.0.0.1', () => {
        idp.issuer = `http://127.0.0.1:${idp.server.address().port}`;
        resolve();
      });
    });

  idp.stop = () => new Promise((resolve) => idp.server.close(resolve));

  return idp;
}

/**
 * Walks through the authorization code flow for an agent:
 * /auth/oidc -> (IdP authorize, simulated) -> /auth/oidc/callback
 */
async function signInViaOidc(agent, idp, claims) {
  const r1 = await agent.get('/auth/oidc').expect(302);
  const authorizeUrl = new URL(r1.headers.location);
  assert.equal(
    authorizeUrl.origin + authorizeUrl.pathname,
    `${idp.issuer}/authorize`,
  );
  assert.equal(authorizeUrl.searchParams.get('client_id'), CLIENT_ID);
  assert.equal(authorizeUrl.searchParams.get('response_type'), 'code');
  assert.equal(authorizeUrl.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(
    authorizeUrl.searchParams.get('redirect_uri'),
    `${PUBLIC_URL}/auth/oidc/callback`,
  );
  assert.equal(
    authorizeUrl.searchParams.get('scope'),
    'openid profile email roles',
  );

  const code = crypto.randomUUID();
  idp.codes.set(code, {
    codeChallenge: authorizeUrl.searchParams.get('code_challenge'),
    redirectUri: authorizeUrl.searchParams.get('redirect_uri'),
  });
  idp.nextClaims = claims;

  const params = new URLSearchParams({ code });
  const state = authorizeUrl.searchParams.get('state');
  if (state) {
    params.set('state', state);
  }
  return agent.get(`/auth/oidc/callback?${params}`).expect(302);
}

describe('auth/oidc', function () {
  const idp = createMockIdp();

  before(async function () {
    await idp.start();
  });

  after(async function () {
    await idp.stop();
  });

  async function makeUtils() {
    const utils = new TestUtil({
      authProxyEnabled: false,
      publicUrl: PUBLIC_URL,
      oidcIssuer: idp.issuer,
      oidcClientId: CLIENT_ID,
      oidcClientSecret: CLIENT_SECRET,
      allowedDomains: 'sqlpad.com',
    });
    await utils.init();
    return utils;
  }

  it('signs in and auto creates user from ID token claims', async function () {
    const utils = await makeUtils();
    const agent = request.agent(utils.app);

    const res = await signInViaOidc(agent, idp, {
      email: 'oidc-user@sqlpad.com',
      given_name: 'Oidc',
      family_name: 'User',
    });
    assert.equal(res.headers.location, '/');

    // Token endpoint was called with client_secret_basic (v5 default)
    assert(idp.lastTokenRequest.authorization.startsWith('Basic '));
    assert(!idp.lastTokenRequest.params.get('client_secret'));

    const { body } = await agent.get('/api/app').expect(200);
    assert.equal(body.currentUser.email, 'oidc-user@sqlpad.com');
    assert.equal(body.currentUser.name, 'Oidc User');
    assert.equal(body.currentUser.role, 'editor');
  });

  it('maps admin role from roles claim', async function () {
    const utils = await makeUtils();
    const agent = request.agent(utils.app);

    await signInViaOidc(agent, idp, {
      email: 'oidc-admin@sqlpad.com',
      name: 'Oidc Admin',
      roles: ['admin'],
    });

    const { body } = await agent.get('/api/app').expect(200);
    assert.equal(body.currentUser.email, 'oidc-admin@sqlpad.com');
    assert.equal(body.currentUser.role, 'admin');
  });

  it('rejects user outside allowed domains', async function () {
    const utils = await makeUtils();
    const agent = request.agent(utils.app);

    const res = await signInViaOidc(agent, idp, {
      email: 'someone@example.com',
    });
    assert.equal(res.headers.location, '/signin');

    const { body } = await agent.get('/api/app').expect(200);
    assert(!body.currentUser);
  });

  it('rejects callback without a pending authorization request', async function () {
    const utils = await makeUtils();
    const res = await request(utils.app)
      .get('/auth/oidc/callback?code=unknown')
      .expect(302);
    assert.equal(res.headers.location, '/signin');
  });
});
