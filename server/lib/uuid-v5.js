import crypto from 'crypto';

/**
 * RFC 4122 / 9562 name-based UUID (version 5, SHA-1).
 * Matches the output of the `uuid` package's v5().
 * @param {string} name
 * @param {string} namespace - UUID string
 * @returns {string}
 */
export default function uuidv5(name, namespace) {
  const nsBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  if (nsBytes.length !== 16) {
    throw new TypeError('namespace must be a valid UUID');
  }
  const hash = crypto
    .createHash('sha1')
    .update(nsBytes)
    .update(Buffer.from(name, 'utf8'))
    .digest();

  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.subarray(0, 16).toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}
