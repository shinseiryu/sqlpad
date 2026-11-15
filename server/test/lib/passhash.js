import assert from 'assert';
import passhash from '../../lib/passhash.js';

describe('lib/passhash', function () {
  const password = 'This is a p@ssw0rd like!';
  let hash;

  it('hashes password', async function () {
    const password = 'This is a p@ssw0rd like!';
    hash = await passhash.getPasshash(password);
  });

  it('correctly compares password to hash', async function () {
    const matches = await passhash.comparePassword(password, hash);
    assert.equal(matches, true, 'password matches');
  });

  it('rejects wrong password', async function () {
    const matches = await passhash.comparePassword('wrong', hash);
    assert.equal(matches, false);
  });

  it('validates $2a$ hashes created by bcryptjs 2.x', async function () {
    // Generated with bcryptjs@2.4.3, which SQLPad used before bcryptjs 3
    const legacyHash =
      '$2a$10$SrSYGbydC9YTYdCSy2lexOSSEC40rIs7rLvsmn5avAq1nNH/hjt4O';
    assert.equal(
      await passhash.comparePassword('sqlpad-password', legacyHash),
      true,
    );
    assert.equal(await passhash.comparePassword('wrong', legacyHash), false);
  });
});
