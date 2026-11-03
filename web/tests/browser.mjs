import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { createPreviewServer } from "../preview.mjs";

let browser, server, origin;
const contexts = [];
const output = fileURLToPath(new URL("../../test/scratch/browser-checks/", import.meta.url));
const key = "burrowkeep-cpu-v1";
const api = "https://aiqiang888.com/burrowkeep-api";
const report = { engine: "Chromium", results: [], pageErrors: [], localFailures: [] };
const state = (overrides = {}) => ({ version: 2, minerId: "testplayer01", refId: "", welcomed: false, ore: 0, satiety: 3, hamster: 1, gear: 1, iron: 0, silver: 0, gold: 0, owned: [], levels: {}, snackUntil: 0, snackReady: 0, totalHashes: 0, shares: 0, friendOre: 0, ...overrides });
const readState = (page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
const result = (name, details) => report.results.push({ name, details });

before(async () => {
  server = createPreviewServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  await mkdir(output, { recursive: true });
});

after(async () => {
  for (const context of contexts) await context.close();
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  await writeFile(join(output, "results.json"), JSON.stringify(report, null, 2));
});

async function game(options = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: options.reducedMotion || "no-preference" });
  contexts.push(context);
  const page = await context.newPage();
  const calls = [];
  const service = { helloFails: false, boardFails: false, pulseFails: false, bonusFails: false, bonus: 0, pending: 0, rows: { wealth: [], decor: [] }, miners: new Map() };
  page.on("pageerror", (error) => report.pageErrors.push(error.message));
  page.on("response", (response) => { if (response.url().startsWith(origin) && response.status() >= 400) report.localFailures.push(response.url().replace(origin, "")); });
  await context.addInitScript(({ saved, lang, fakeWorker, clipboardFail, key }) => {
    if (!localStorage.getItem(key) && saved) localStorage.setItem(key, JSON.stringify(saved));
    if (lang) localStorage.setItem("burrowkeep-lang", lang);
    if (fakeWorker) {
      window.Worker = class {
        postMessage(message) { if (message.type === "start") queueMicrotask(() => this.onmessage?.({ data: { hashes: 800000, shares: 1 } })); }
        terminate() {}
      };
    }
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: {
      writeText: async (text) => { if (clipboardFail) throw new Error("Clipboard denied"); window.testCopied = text; },
    } });
  }, { saved: options.saved, lang: options.lang, fakeWorker: options.fakeWorker, clipboardFail: options.clipboardFail, key });
  await page.route(`${api}/**`, async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace("/burrowkeep-api", "");
    const body = request.method() === "POST" ? request.postDataJSON() : null;
    const call = { method: request.method(), path, body, url: request.url() };
    calls.push(call);
    const headers = { "access-control-allow-origin": "*", "content-type": "application/json" };
    const send = (data, status = 200) => route.fulfill({ status, headers, body: JSON.stringify(data) });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { ...headers, "access-control-allow-methods": "GET, POST, OPTIONS", "access-control-allow-headers": "content-type" } });
    if (path === "/api/hello") {
      if (service.helloFails) return send({ error: "unavailable" }, 503);
      if (!service.miners.has(body.minerId)) service.miners.set(body.minerId, body.refId || "");
      const refId = service.miners.get(body.minerId);
      return send({ refId, bound: Boolean(refId), locked: true });
    }
    if (path === "/api/board") {
      if (service.boardFails) return send({ error: "unavailable" }, 503);
      if (request.method() === "POST") return send({ ok: true });
      return send(service.rows);
    }
    if (path === "/api/pulse") return service.pulseFails ? send({ error: "unavailable" }, 503) : send({ ok: true, accepted: body.ore });
    if (path === "/api/bonus") {
      if (service.bonusFails) return send({ error: "unavailable" }, 503);
      const ore = service.bonus;
      service.bonus = 0;
      return send({ ore, pendingMilli: service.pending, refId: "", bound: false });
    }
    return send({ error: "Unexpected API path" }, 404);
  });
  if (options.clock) await page.clock.install();
  if (options.setup) options.setup(service);
  await page.goto(`${origin}/preview/${options.query || ""}`);
  await page.waitForFunction(() => document.querySelector("#power")?.textContent.length > 0);
  return { page, context, calls, service };
}

async function tick(page, ms = 5100) {
  await page.clock.runFor(ms);
  // Let routed responses and their microtasks settle before the next virtual interval.
  await page.waitForFunction(() => true);
}

test("mobile and desktop export, both languages, keyboard and first-screen action", async () => {
  const { page, calls } = await game();
  for (const lang of ["zh", "en"]) {
    if (lang === "en") await page.locator("#lang").click();
    for (const width of [320, 390, 720, 721, 1024, 1440]) {
      await page.setViewportSize({ width, height: 844 });
      const layout = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth, viewport: innerWidth,
        canvas: document.querySelector("#room").getBoundingClientRect().width,
        power: document.querySelector("#power").getBoundingClientRect().bottom,
        board: document.querySelector(".boards").getBoundingClientRect().top,
        choices: document.querySelector(".choices").getBoundingClientRect().bottom,
      }));
      assert.ok(layout.scroll <= width, `${lang} at ${width}: no horizontal overflow`);
      if (width === 390) {
        assert.ok(layout.canvas >= 300, "game scene fills the phone column");
        assert.ok(layout.power <= 844, "main action fits the first screen");
        await page.screenshot({ path: join(output, `${lang}-390.png`), fullPage: true });
      }
      if (width <= 720) assert.ok(layout.board >= layout.choices, "boards stack below the game on mobile");
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.keyboard.press("Tab");
  await page.locator('#tabs button[data-tab="home"]').focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.activeElement.dataset.tab), "home");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  assert.equal(await page.evaluate(() => document.activeElement.dataset.tab), "raise");
  assert.equal(await page.locator('#tabs button[data-tab="raise"]').getAttribute("aria-pressed"), "true");
  await page.locator("#power").focus();
  assert.equal(await page.locator("#power").evaluate((el) => getComputedStyle(el).outlineStyle), "solid");
  await page.locator("#power").scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(output, "focus-390.png") });
  assert.ok(calls.every((call) => call.url.startsWith(api)), "API traffic always uses the shared service");
  assert.equal(await page.title(), "Burrowkeep");
  for (const selector of ['meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:image"]', 'link[rel="icon"]']) assert.ok(await page.locator(selector).getAttribute(selector.startsWith("link") ? "href" : "content"));
  const image = await page.request.get(`${origin}/preview/social.png`);
  assert.equal(image.status(), 200);
  result("Responsive export", "320, 390, 720, 721, 1024, 1440 CSS px, Chinese and English; first-screen game and action at 390.");
});

test("real mining workers start only on request, mint ore and stop", { timeout: 30000 }, async () => {
  const { page } = await game({ lang: "en" });
  const workers = [];
  page.on("worker", (worker) => workers.push(worker));
  assert.equal(workers.length, 0);
  await page.locator("#power").focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).ore > 0, key, { timeout: 20000 });
  assert.ok(workers.length > 0);
  const mined = await readState(page);
  assert.ok(mined.totalHashes >= 400000);
  const activeAudit = await new AxeBuilder({ page }).include("#power").withTags(["wcag2aa"]).analyze();
  assert.deepEqual(activeAudit.violations.map((violation) => violation.id), [], "active Stop control meets contrast requirements");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator("#power").textContent(), "Start mining");
  // Periodic paints can update the label immediately after the stop event.
  await page.waitForFunction(() => document.querySelector("#power").textContent === "Start mining");
  await page.waitForTimeout(700);
  const stopped = await readState(page);
  await page.waitForTimeout(700);
  assert.equal((await readState(page)).totalHashes, stopped.totalHashes);
  result("Mining", "Real module workers computed SHA-256, booked ore, and stopped after keyboard activation; active Stop control passed Axe contrast validation.");
});

test("shop, exchanges, care, upgrades and score payloads", async () => {
  const { page, calls } = await game({ lang: "en", saved: state({ ore: 250, iron: 3 }) });
  await page.getByRole("button", { name: "100 ore → 1 iron", exact: true }).click();
  assert.equal((await readState(page)).ore, 150);
  await page.getByRole("button", { name: /^Bowl / }).click();
  assert.equal((await readState(page)).iron, 2);
  await page.getByRole("button", { name: /^Bowl Lv 1/ }).click();
  assert.equal((await readState(page)).levels.bowl, 2);
  await page.getByRole("button", { name: "Care", exact: true }).click();
  await page.getByRole("button", { name: /^Feed / }).click();
  await page.getByRole("button", { name: /^Raise the hamster / }).click();
  await page.getByRole("button", { name: /^Add a rig / }).click();
  const saved = await readState(page);
  assert.equal(saved.ore, 112);
  assert.equal(saved.satiety, 4);
  assert.equal(saved.hamster, 2);
  assert.equal(saved.gear, 2);
  await page.waitForFunction(() => document.querySelector(".invite-binding").textContent.includes("No inviter"));
  await page.getByRole("button", { name: "Home shop", exact: true }).click();
  await page.waitForTimeout(100);
  assert.ok(calls.some((call) => call.path === "/api/board" && call.body?.decor === 4));
  await page.reload();
  assert.equal((await readState(page)).ore, 112);
  assert.equal((await readState(page)).levels.bowl, 2);
  result("Economy interactions", "Exchange, buy, decor upgrade, feed, hamster/rig upgrades and reload persistence used the original costs; decor score submitted.");
});

test("first-visit invite remains pending offline, retries and locks before score registration", async () => {
  const { page, calls, service } = await game({ lang: "en", clock: true, query: "?ref=testinviter01", setup: (service) => { service.helloFails = true; } });
  await page.waitForFunction(() => document.querySelector(".invite-connection").textContent.includes("unavailable"));
  assert.equal(calls.filter((call) => call.path === "/api/board").length, 0);
  assert.equal((await readState(page)).welcomed, false);
  service.helloFails = false;
  await tick(page);
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).welcomed, key);
  assert.equal((await readState(page)).refId, "testinviter01");
  await tick(page);
  await page.waitForFunction(() => document.querySelector("#wealth-list").textContent.includes("Nobody is ranked"));
  const firstBoard = calls.findIndex((call) => call.path === "/api/board");
  const hellos = calls.slice(0, firstBoard).filter((call) => call.path === "/api/hello");
  assert.ok(hellos.length >= 2);
  assert.equal(hellos.at(-1).body.refId, "testinviter01");
  await page.goto(`${origin}/preview/?ref=otherinviter01`);
  await page.waitForFunction(() => document.querySelector(".invite-binding").textContent.includes("testinviter01"));
  assert.equal((await readState(page)).refId, "testinviter01");
  result("Invites", "Failed initial registration retried with the original inviter; no score post preceded registration; later links could not replace the locked inviter.");
});

test("invite copy works, stays focused across polling, and clipboard failure offers manual copy", async () => {
  const { page } = await game({ lang: "en", clock: true });
  const button = page.locator("#invite button");
  await button.click();
  const link = await page.locator("#invite-link").inputValue();
  assert.equal(await page.evaluate(() => window.testCopied), link);
  assert.match(link, /\/preview\/\?ref=[a-z0-9]{12}$/);
  await page.locator("#invite-link").focus();
  await tick(page);
  assert.equal(await page.evaluate(() => document.activeElement.id), "invite-link");
  assert.equal(await button.textContent(), "Copied");
  const fallback = await game({ lang: "en", clipboardFail: true });
  await fallback.page.getByRole("button", { name: "Copy ore invite", exact: true }).click();
  assert.equal(await fallback.page.evaluate(() => document.activeElement.id), "invite-link");
  assert.equal(await fallback.page.locator("#invite-link").evaluate((el) => el.selectionEnd - el.selectionStart), (await fallback.page.locator("#invite-link").inputValue()).length);
  assert.equal(await fallback.page.locator("#invite button").textContent(), "Copy the selected link above");
  result("Copy invite", "Correct subpath link copied; input focus preserved during polling; denied clipboard selects the full link and displays manual-copy guidance.");
});

test("failed ore pulses are retried, bonus is credited once and API failures recover", async () => {
  const { page, calls, service } = await game({ lang: "en", clock: true, fakeWorker: true, saved: state(), setup: (service) => { service.pulseFails = true; } });
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).welcomed, key);
  await page.locator("#power").click();
  await tick(page, 600);
  assert.equal((await readState(page)).ore, 2);
  await page.locator("#power").click();
  await tick(page, 4500);
  await page.waitForFunction(() => document.querySelector(".invite-connection").textContent.includes("unavailable"));
  assert.equal(calls.filter((call) => call.path === "/api/pulse")[0].body.ore, 2);
  service.pulseFails = false;
  service.bonus = 1;
  service.pending = 500;
  await tick(page);
  await page.waitForFunction((key) => JSON.parse(localStorage.getItem(key)).friendOre === 1, key);
  const pulses = calls.filter((call) => call.path === "/api/pulse");
  assert.equal(pulses.length, 2);
  assert.equal(pulses[1].body.ore, 2);
  assert.equal((await readState(page)).ore, 3);
  await tick(page);
  assert.equal((await readState(page)).ore, 3);
  assert.match(await page.locator(".invite-pay").textContent(), /0.50/);
  result("Pulse and bonus", "Test-only hash messages minted 2 ore; failed pulse retried the same amount; 1 bonus ore credited once and 0.50 pending displayed.");
});

test("leaderboards load real response rows, retain stale data on failure, and recover from malformed data", async () => {
  const { page, service } = await game({ lang: "en", clock: true, setup: (service) => { service.rows = { wealth: [{ id: "testleader01", score: 12 }], decor: [] }; } });
  await page.waitForFunction(() => document.querySelector("#wealth-list").textContent.includes("testleader01"));
  service.boardFails = true;
  await tick(page);
  await page.waitForFunction(() => document.querySelector("#wealth-mine").textContent.includes("unavailable"));
  assert.match(await page.locator("#wealth-list").textContent(), /testleader01/);
  service.boardFails = false;
  service.rows = { wealth: [{ id: "<script>bad</script>", score: 2 }], decor: [] };
  await tick(page);
  assert.match(await page.locator("#wealth-list").textContent(), /testleader01/);
  service.rows = { wealth: [], decor: [] };
  await tick(page);
  await page.waitForFunction(() => document.querySelector("#wealth-list").textContent === "Nobody is ranked yet");
  result("Leaderboards", "Populated, empty, unavailable, stale, malformed and recovery states checked with explicitly isolated service fixtures.");
});

test("automated accessibility, text enlargement and reduced-motion smoke check", async () => {
  const { page } = await game({ lang: "en", reducedMotion: "reduce" });
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  await writeFile(join(output, "axe.json"), JSON.stringify(axe.violations, null, 2));
  assert.deepEqual(axe.violations.map((violation) => ({ id: violation.id, impact: violation.impact, nodes: violation.nodes.map((node) => node.target) })), []);
  const scene = await page.locator("#room").evaluate((canvas) => canvas.toDataURL());
  await page.waitForTimeout(120);
  assert.equal(await page.locator("#room").evaluate((canvas) => canvas.toDataURL()), scene, "reduced motion keeps the idle scene static");
  await page.evaluate(() => {
    const styles = [...document.querySelectorAll("body, body *")].map((el) => [el, parseFloat(getComputedStyle(el).fontSize)]);
    for (const [el, size] of styles) el.style.setProperty("font-size", `${size * 2}px`, "important");
  });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  result("Accessibility", "Axe WCAG A/AA scan, reduced-motion media variant and 200% text enlargement checked; native zoom, physical devices and screen readers not tested.");
  assert.deepEqual(report.pageErrors, []);
  assert.deepEqual(report.localFailures, []);
});
