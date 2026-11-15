import passport from 'passport';
import appLog from '../lib/app-log.js';
import checkAllowedDomains from '../lib/check-allowed-domains.js';
import * as oidcClient from 'openid-client';
import { Strategy } from 'openid-client/passport';

async function openidClientHandler(req, tokenSet, done) {
  const { models, config, appLog, webhooks } = req;

  const _json = tokenSet.claims() || {};
  const email = _json.email || _json.preferred_username;
  let name = _json.name;
  if (!name && _json.given_name && _json.family_name) {
    name = `${_json.given_name} ${_json.family_name}`;
  }

  if (!email) {
    appLog.debug('OIDC email not provided');
    return done(null, false, {
      message: 'email not provided',
    });
  }
  let role = 'editor';
  if (_json.roles && _json.roles.includes('admin')) {
    role = 'admin';
  }
  try {
    let user = await models.users.findOneByEmail(email);

    if (user) {
      if (user.disabled) {
        appLog.debug(`OIDC User ${email} is disabled`);
        return done(null, false);
      }
      user.signupAt = new Date();
      const newUser = await models.users.update(user.id, {
        name,
        role,
        signupAt: new Date(),
      });
      appLog.debug(`OIDC User ${email} updated`);
      return done(null, newUser);
    }
    const allowedDomains = config.get('allowedDomains');
    if (checkAllowedDomains(allowedDomains, email)) {
      const newUser = await models.users.create({
        name,
        email,
        role,
        signupAt: new Date(),
      });
      webhooks.userCreated(newUser);
      appLog.debug(`OIDC User ${email} created`);
      return done(null, newUser);
    }
    // at this point we don't have an error, but authentication is invalid
    // per passport docs, we call done() here without an error
    // instead passing false for user and a message why
    appLog.debug(`OIDC User ${email} not allowed`);
    return done(null, false, {
      message: "You haven't been invited by an admin yet.",
    });
  } catch (error) {
    done(error, null);
  }
}

/**
 * Adds OIDC auth strategy if OIDC auth is configured
 * @param {object} config
 */
async function enableOidc(config) {
  if (config.oidcConfigured()) {
    appLog.info('Enabling OIDC authentication strategy (via openid-client).');

    const baseUrl = config.get('baseUrl');
    const publicUrl = config.get('publicUrl');

    const issuerUrl = new URL(config.get('oidcIssuer'));
    const callbackURL = `${publicUrl}${baseUrl}/auth/oidc/callback`;

    // openid-client 6 refuses plain-http endpoints by default.
    // v5 allowed them, so keep allowing them (e.g. local IdPs), but warn.
    const discoveryOptions = {};
    if (issuerUrl.protocol === 'http:') {
      appLog.warn(
        'OIDC issuer uses plain HTTP. This is insecure and should only be used for local development.',
      );
      discoveryOptions.execute = [oidcClient.allowInsecureRequests];
    }

    // client_secret_basic was the openid-client 5 default token endpoint auth method.
    // v6 defaults to client_secret_post, so set basic explicitly to keep IdP compatibility.
    const oidcConfig = await oidcClient.discovery(
      issuerUrl,
      config.get('oidcClientId'),
      undefined,
      oidcClient.ClientSecretBasic(config.get('oidcClientSecret')),
      discoveryOptions,
    );

    passport.use(
      'oidc',
      new Strategy(
        {
          name: 'oidc',
          config: oidcConfig,
          callbackURL,
          passReqToCallback: true,
          scope: config.get('oidcScope') || 'openid profile email roles',
        },
        openidClientHandler,
      ),
    );
  }
}

export default enableOidc;
