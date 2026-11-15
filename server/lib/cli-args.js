import { parseArgs } from 'util';

/**
 * Parses CLI arguments into a minimist-style object.
 *
 * Any `--flag` is accepted (Config validates names against config items).
 * `--flag value` and `--flag=value` set a string value,
 * a bare `--flag` (followed by another flag or nothing) is `true`,
 * and `--no-flag` is `false`. Positionals are collected in `_`.
 *
 * @param {string[]} args - typically process.argv.slice(2)
 * @returns {{ _: string[], [key: string]: string | boolean | string[] }}
 */
export default function parseCliArgs(args) {
  const { tokens } = parseArgs({
    args,
    strict: false,
    allowPositionals: true,
    tokens: true,
  });

  const argv = { _: [] };
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.kind === 'positional') {
      argv._.push(token.value);
    } else if (token.kind === 'option') {
      if (token.value !== undefined) {
        argv[token.name] = token.value;
      } else if (
        token.name.startsWith('no-') &&
        token.rawName.startsWith('--')
      ) {
        argv[token.name.slice(3)] = false;
      } else if (
        tokens[i + 1]?.kind === 'positional' &&
        tokens[i + 1].index === token.index + 1
      ) {
        argv[token.name] = tokens[i + 1].value;
        i++;
      } else {
        argv[token.name] = true;
      }
    }
  }
  return argv;
}
