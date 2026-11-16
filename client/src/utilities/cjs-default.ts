/**
 * Returns the default export of a CommonJS module compiled from ESM
 * (one that sets `exports.__esModule` and `exports.default`).
 *
 * Vite 8 follows Node's interop: a default import of such a module yields the
 * whole `module.exports` object rather than `exports.default`, which earlier
 * Vite versions unwrapped. Only react-ace and the taucharts plugins need this;
 * remove it once those are replaced (#20, #21).
 */
export default function cjsDefault<T>(mod: T): T {
  const m = mod as { __esModule?: boolean; default?: T };
  return m && m.__esModule && m.default !== undefined ? m.default : mod;
}
