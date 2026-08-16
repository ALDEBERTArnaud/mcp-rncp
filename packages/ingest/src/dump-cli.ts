// bun run src/dump-cli.ts <in.sqlite> <out.sql> — standalone D1 dump (used for local dev fixtures).
import { dumpForD1 } from "./dump.ts";

const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error("usage: dump-cli <in.sqlite> <out.sql>");
console.log(JSON.stringify(await dumpForD1(input, output)));
