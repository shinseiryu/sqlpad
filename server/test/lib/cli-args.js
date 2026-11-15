import assert from 'assert';
import parseCliArgs from '../../lib/cli-args.js';

describe('lib/cli-args', function () {
  // Expected values match what minimist produced (other than numbers staying strings)
  const cases = [
    [
      ['--port', '3010', '--migrate', '--config', 'x.env'],
      { _: [], port: '3010', migrate: true, config: 'x.env' },
    ],
    [['-v'], { _: [], v: true }],
    [['-h'], { _: [], h: true }],
    [['--help'], { _: [], help: true }],
    [['version'], { _: ['version'] }],
    [
      ['--port=3010', '--baseUrl', '/sqlpad'],
      { _: [], port: '3010', baseUrl: '/sqlpad' },
    ],
    [['--migrate=false'], { _: [], migrate: 'false' }],
    [['--no-x'], { _: [], x: false }],
    [['--a', 'b', 'c'], { _: ['c'], a: 'b' }],
    [['--dbPath', '../db', '--', '--x'], { _: ['--x'], dbPath: '../db' }],
    [['--migrate'], { _: [], migrate: true }],
    [[], { _: [] }],
  ];

  for (const [args, expected] of cases) {
    it(`parses ${JSON.stringify(args)}`, function () {
      assert.deepStrictEqual(parseCliArgs(args), expected);
    });
  }
});
