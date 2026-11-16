/**
 * Returns the default export of a CommonJS module compiled from ESM
 * (one that sets `exports.__esModule` and `exports.default`).
 *
 * Vite 8 follows Node's interop: a default import of such a module yields the
 * whole `module.exports` object rather than `exports.default`, which earlier
 * Vite versions unwrapped. Only the taucharts plugins need this now;
 * remove it once taucharts is replaced (#20).
 */
export default function cjsDefault<T>(mod: T): T {
  const m = mod as { __esModule?: boolean; default?: T };
  return m && m.__esModule && m.default !== undefined ? m.default : mod;
}
