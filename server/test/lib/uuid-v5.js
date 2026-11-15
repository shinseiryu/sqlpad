import assert from 'assert';
import uuidv5 from '../../lib/uuid-v5.js';
import consts from '../../lib/consts.js';

describe('lib/uuid-v5', function () {
  // Expected values generated with uuid@10 v5()
  const ns = consts.CONNECTION_HASH_NAMESPACE;

  it('matches uuid package output', function () {
    assert.equal(
      uuidv5('{"host":"localhost","port":5432}', ns),
      'a7e3e93a-e03a-5b96-98ad-8a2578959cea',
    );
    assert.equal(uuidv5('', ns), '417da433-649f-55ef-b6c2-33c41ea00c75');
    assert.equal(
      uuidv5('ünïcode ✓', ns),
      'ad541357-52f4-5be9-bc2a-ce558fc08624',
    );
  });

  it('throws on invalid namespace', function () {
    assert.throws(() => uuidv5('x', 'not-a-uuid'), TypeError);
  });
});
