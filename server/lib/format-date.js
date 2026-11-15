const WEEKDAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
const DAY_MS = 24 * 60 * 60 * 1000;

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Local date as YYYY-MM-DD
 * @param {Date} [date]
 */
export function formatIsoDate(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate(),
  )}`;
}

function formatTime(date) {
  const hours = date.getHours();
  const h12 = hours % 12 || 12;
  return `${h12}:${pad2(date.getMinutes())} ${hours < 12 ? 'AM' : 'PM'}`;
}

function formatShortDate(date) {
  return `${pad2(date.getMonth() + 1)}/${pad2(
    date.getDate(),
  )}/${date.getFullYear()}`;
}

/**
 * Relative calendar label, same output as moment's en `calendar()`:
 * "Today at 9:00 AM", "Yesterday at ...", "Last Monday at ...",
 * "Tomorrow at ...", "Friday at ...", otherwise "MM/DD/YYYY".
 * Uses server local time.
 *
 * @param {Date|string|number|null|undefined} value
 * @param {Date} [now]
 * @returns {string|null} null when value is empty or invalid
 */
export function formatCalendar(value, now = new Date()) {
  if (value === null || value === undefined) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  // Same DST adjustment moment applies to day diffs
  const zoneDelta =
    (date.getTimezoneOffset() - startOfToday.getTimezoneOffset()) * 60000;
  const diff = (date - startOfToday - zoneDelta) / DAY_MS;

  const time = formatTime(date);
  const weekday = WEEKDAYS[date.getDay()];

  if (diff < -6) return formatShortDate(date);
  if (diff < -1) return `Last ${weekday} at ${time}`;
  if (diff < 0) return `Yesterday at ${time}`;
  if (diff < 1) return `Today at ${time}`;
  if (diff < 2) return `Tomorrow at ${time}`;
  if (diff < 7) return `${weekday} at ${time}`;
  return formatShortDate(date);
}
