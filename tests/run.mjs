// End-to-end checks for the hugo-adv theme using the fictitious exampleSite.
// Usage: node tests/run.mjs [--site <dir>] [--screenshots <dir>]
// Exits non-zero on any failure. Requires Hugo extended on PATH.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (name, def) => {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : def;
};
const siteDir = path.resolve(arg("--site", path.join(root, "exampleSite")));
const shots = arg("--screenshots", "");
const out = fs.mkdtempSync(path.join(os.tmpdir(), "hugo-adv-test-"));

const BUDGET = { css: 30 * 1024, js: 5 * 1024 };
const failures = [];
const fail = (msg) => failures.push(msg);

// ---------- Build (warnings fail the build) ----------
console.log(`build: ${siteDir}`);
execFileSync("hugo", ["-s", siteDir, "-d", out, "--gc", "--minify", "--panicOnWarning", "--quiet"], {
  stdio: "inherit",
  env: { ...process.env, HUGO_ENVIRONMENT: "development" },
});

// ---------- Budget ----------
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
const files = walk(out);
const size = (ext) => files.filter((f) => f.endsWith(ext)).reduce((s, f) => s + fs.statSync(f).size, 0);
for (const [k, ext] of [["css", ".css"], ["js", ".js"]]) {
  const s = size(ext);
  console.log(`budget: ${k} ${s} bytes (max ${BUDGET[k]})`);
  if (s > BUDGET[k]) fail(`budget: ${k} is ${s} bytes, over ${BUDGET[k]}`);
}

// ---------- Static server applying _headers ("/*" and path-prefix blocks) ----------
const headerRules = [];
const hf = path.join(out, "_headers");
if (!fs.existsSync(hf)) fail("_headers not generated");
else {
  let cur = null;
  for (const line of fs.readFileSync(hf, "utf8").split("\n")) {
    if (!line.trim()) continue;
    if (!/^\s/.test(line)) {
      cur = { pattern: line.trim(), headers: {} };
      headerRules.push(cur);
    } else if (cur) {
      const i = line.indexOf(":");
      cur.headers[line.slice(0, i).trim()] = line.slice(i + 1).trim();
    }
  }
}
const matches = (pattern, url) => (pattern.endsWith("*") ? url.startsWith(pattern.slice(0, -1)) : url === pattern);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp", ".xml": "application/xml", ".txt": "text/plain", ".png": "image/png", ".jpg": "image/jpeg" };
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.join(out, url);
  if (!file.startsWith(out)) return res.writeHead(403).end();
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  const status = fs.existsSync(file) ? 200 : 404;
  if (status === 404) file = path.join(out, "404.html");
  const h = { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" };
  // upgrade-insecure-requests would break plain-http local testing; drop only that directive.
  for (const r of headerRules) if (matches(r.pattern, url)) Object.assign(h, r.headers);
  if (h["Content-Security-Policy"]) h["Content-Security-Policy"] = h["Content-Security-Policy"].replace(/;\s*upgrade-insecure-requests/, "");
  res.writeHead(status, h).end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

// ---------- Pages from sitemap ----------
const sitemap = fs.readFileSync(path.join(out, "sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
urls.push("/pagina-que-nao-existe/");
console.log(`pages: ${urls.length}`);

const viewports = { desktop: { width: 1280, height: 900 }, mobile: { width: 375, height: 812 } };
const browser = await chromium.launch();
const linksSeen = new Set();
for (const [vpName, viewport] of Object.entries(viewports)) {
  const ctx = await browser.newContext({ viewport, colorScheme: "light" });
  for (const u of urls) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    const resp = await page.goto(base + u, { waitUntil: "networkidle" });
    const expected = u === "/pagina-que-nao-existe/" ? 404 : 200;
    if (resp.status() !== expected) fail(`${vpName} ${u}: status ${resp.status()}`);
    for (const e of errors) if (!(expected === 404 && /status of 404/.test(e))) fail(`${vpName} ${u}: console error: ${e}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) fail(`${vpName} ${u}: horizontal overflow of ${overflow}px`);
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    for (const v of axe.violations) fail(`${vpName} ${u}: axe ${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(" ")}`);
    if (vpName === "desktop") for (const href of await page.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href")))) linksSeen.add(href.split("#")[0]);
    if (shots) {
      fs.mkdirSync(shots, { recursive: true });
      const name = `${vpName}${u.replaceAll("/", "_") || "_"}`.replace(/_+$/, "") || vpName;
      await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
    }
    await page.close();
  }
  // Dark mode spot check on home for contrast.
  const dark = await browser.newContext({ viewport, colorScheme: "dark" });
  const dp = await dark.newPage();
  await dp.goto(`${base}/`, { waitUntil: "networkidle" });
  const axeDark = await new AxeBuilder({ page: dp }).withTags(["wcag2aa"]).analyze();
  for (const v of axeDark.violations) fail(`${vpName} dark /: axe ${v.id}: ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(" ")}`);
  if (shots) await dp.screenshot({ path: path.join(shots, `${vpName}_dark_home.png`), fullPage: true });
  await dark.close();
  await ctx.close();
}

// ---------- Internal links ----------
for (const href of linksSeen) {
  const r = await fetch(base + href);
  if (r.status !== 200) fail(`broken link: ${href} (${r.status})`);
}
console.log(`internal links checked: ${linksSeen.size}`);

await browser.close();
server.close();
fs.rmSync(out, { recursive: true, force: true });

if (failures.length) {
  console.error(`\nFAILED (${failures.length}):`);
  for (const f of failures) console.error(`- ${f}`);
  process.exit(1);
}
console.log("\nOK: all checks passed");
