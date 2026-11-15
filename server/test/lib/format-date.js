import assert from 'assert';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { formatCalendar, formatIsoDate } from '../../lib/format-date.js';

describe('lib/format-date', function () {
  it('formatIsoDate uses local date parts', function () {
    assert.equal(formatIsoDate(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  });

  it('formatCalendar returns null for empty/invalid values', function () {
    assert.equal(formatCalendar(null), null);
    assert.equal(formatCalendar(undefined), null);
    assert.equal(formatCalendar('nope'), null);
  });

  it('formatCalendar matches moment calendar() output', function () {
    // Run in a child process with a fixed timezone (incl. DST rules)
    // Expected values generated with moment@2.31 calendar() in America/Chicago
    const moduleUrl = new URL('../../lib/format-date.js', import.meta.url);
    const script = `
      import { formatCalendar } from ${JSON.stringify(moduleUrl.href)};
      const now = new Date(2026, 10, 18, 15, 30);
      const dates = [
        [2026, 10, 18, 0, 5], [2026, 10, 18, 23, 59], [2026, 10, 17, 9, 0],
        [2026, 10, 16, 12, 0], [2026, 10, 12, 0, 0], [2026, 10, 11, 23, 59],
        [2026, 10, 19, 8, 0], [2026, 10, 20, 8, 0], [2026, 10, 24, 20, 0],
        [2026, 10, 25, 0, 0], [2025, 0, 5, 7, 3],
      ];
      const dstNow = new Date(2026, 10, 2, 10, 0); // day after DST ends
      const dstDates = [
        [2026, 9, 27, 0, 30], [2026, 9, 26, 23, 30], [2026, 10, 1, 1, 30],
        [2026, 10, 8, 23, 59], [2026, 10, 9, 0, 0],
      ];
      console.log(JSON.stringify([
        ...dates.map((d) => formatCalendar(new Date(...d), now)),
        ...dstDates.map((d) => formatCalendar(new Date(...d), dstNow)),
      ]));
    `;
    const out = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', script],
      {
        env: { ...process.env, TZ: 'America/Chicago' },
        cwd: fileURLToPath(new URL('.', import.meta.url)),
      },
    );
    assert.deepStrictEqual(JSON.parse(out.toString()), [
      'Today at 12:05 AM',
      'Today at 11:59 PM',
      'Yesterday at 9:00 AM',
      'Last Monday at 12:00 PM',
      'Last Thursday at 12:00 AM',
      '11/11/2026',
      'Tomorrow at 8:00 AM',
      'Friday at 8:00 AM',
      'Tuesday at 8:00 PM',
      '11/25/2026',
      '01/05/2025',
      'Last Tuesday at 12:30 AM',
      '10/26/2026',
      'Yesterday at 1:30 AM',
      'Sunday at 11:59 PM',
      '11/09/2026',
    ]);
  });
});
