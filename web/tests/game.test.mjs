import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import * as economy from "../../economy.js";
import { sha256, isShare } from "../../hash.js";

const fresh = () => ({ ore: 1000, satiety: 3, hamster: 1, gear: 1, iron: 20, silver: 20, gold: 20, owned: [], levels: {} });

test("SHA-256 matches standard vectors and the worker's 24-byte input", () => {
  for (const input of [Buffer.alloc(0), Buffer.from("abc"), Buffer.alloc(24, 17), Buffer.alloc(200, 42)]) {
    assert.equal(Buffer.from(sha256(input)).toString("hex"), createHash("sha256").update(input).digest("hex"));
  }
  assert.equal(isShare(Uint8Array.of(0, 0, 4)), true);
  assert.equal(isShare(Uint8Array.of(0, 1, 4)), false);
});

test("mining, hunger, level caps and hash remainder preserve the existing rules", () => {
  assert.equal(economy.MAX_LEVEL, 8);
  assert.equal(economy.hashesPerOre(1, false), 400000);
  assert.equal(economy.hashesPerOre(1, true), 800000);
  assert.equal(economy.hashesPerOre(8, false), 50000);
  assert.deepEqual(economy.mintOre(850000, 1, false), { ore: 2, leftover: 50000, need: 400000 });
  assert.equal(economy.threadsFor(8, 2), 2);
  assert.equal(economy.friendOreMilli(20), 1000);
  assert.equal(economy.feed(fresh()).ore, 992);
  assert.equal(economy.feed({ ...fresh(), satiety: 8 }), null);
  assert.equal(economy.upgrade(fresh(), "hamster").ore, 988);
  assert.equal(economy.upgrade(fresh(), "gear").ore, 982);
  assert.equal(economy.upgrade({ ...fresh(), hamster: 8 }, "hamster"), null);
});

test("currency, decor and snack transactions retain their costs and caps", () => {
  assert.equal(economy.exchange(fresh(), "iron").ore, 900);
  assert.equal(economy.exchange(fresh(), "silver").iron, 10);
  assert.equal(economy.exchange(fresh(), "gold").silver, 10);
  assert.equal(economy.exchange({ ...fresh(), ore: 99 }, "iron"), null);
  const item = { id: "bowl", sand: "iron", cost: 2 };
  const bought = economy.buyItem(fresh(), item);
  assert.equal(bought.iron, 18);
  assert.equal(economy.buyItem(bought, item), null);
  const level2 = economy.upgradeDecor(bought, item);
  const level3 = economy.upgradeDecor(level2, item);
  assert.equal(level2.iron, 16);
  assert.equal(level3.iron, 12);
  assert.equal(economy.upgradeDecor(level3, item), null);
  assert.equal(economy.snack(fresh(), 1000), null);
  const snack = economy.snack({ ...fresh(), owned: ["tin"] }, 1000);
  assert.equal(snack.ore, 994);
  assert.equal(snack.snackUntil, 16000);
  assert.equal(snack.snackReady, 61000);
  assert.equal(economy.snack(snack, 2000), null);
});

test("the production export contains every local runtime dependency", async () => {
  const files = ["index.html", "styles.css", "mill.js", "api.js", "worker.js", "hash.js", "economy.js", "social.png"];
  for (const name of files) {
    const source = await readFile(new URL(`../../${name}`, import.meta.url));
    const built = await readFile(new URL(`../../dist/${name}`, import.meta.url));
    assert.ok(source.equals(built), `${name} is current in dist/`);
  }
  const html = await readFile(new URL("../../dist/index.html", import.meta.url), "utf8");
  assert.match(html, /property="og:image" content="\.\/social.png"/);
  assert.doesNotMatch(html, /(?:src|href)="\/(?!\/)/);
});
