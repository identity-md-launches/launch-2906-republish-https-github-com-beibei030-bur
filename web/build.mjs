import { copyFile, mkdir, readdir, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const root = fileURLToPath(new URL("../", import.meta.url));
const dist = join(root, "dist");
const files = ["index.html", "styles.css", "mill.js", "economy.js", "hash.js", "worker.js", "api.js", "social.png"];

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
for (const file of files) await copyFile(join(root, file), join(dist, file));
const bytes = (await Promise.all((await readdir(dist)).map(async (name) => (await stat(join(dist, name))).size))).reduce((sum, size) => sum + size, 0);
console.log(`Built dist/: ${files.length} files, ${bytes} bytes. All runtime modules and assets are local.`);
