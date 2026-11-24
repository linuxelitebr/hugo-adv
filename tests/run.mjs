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
const articlesPath = arg("--articles", "/artigos/");
const articleRe = new RegExp(`^${articlesPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^/]+/$`);
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
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      cur = { pattern: line.trim(), headers: {} };
      headerRules.push(cur);
    } else if (cur) {
      const l = line.trim();
      if (l.startsWith("#")) continue;
      // "! Name" detaches a header set by another rule (Cloudflare _headers syntax).
      if (l.startsWith("!")) { (cur.detach ??= []).push(l.slice(1).trim().toLowerCase()); continue; }
      const i = l.indexOf(":");
      cur.headers[l.slice(0, i).trim()] = l.slice(i + 1).trim();
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
  for (const r of headerRules) {
    if (!matches(r.pattern, url)) continue;
    for (const d of r.detach ?? []) for (const k of Object.keys(h)) if (k.toLowerCase() === d) delete h[k];
    Object.assign(h, r.headers);
  }
  if (h["Content-Security-Policy"]) h["Content-Security-Policy"] = h["Content-Security-Policy"].replace(/;\s*upgrade-insecure-requests/, "");
  res.writeHead(status, h).end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

// ---------- Pages from sitemap ----------
const sitemap = fs.readFileSync(path.join(out, "sitemap.xml"), "utf8");
const entries = [...sitemap.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
const locs = entries.map((e) => e.match(/<loc>([^<]+)<\/loc>/)?.[1] ?? "");
const urls = locs.map((l) => new URL(l).pathname);
// Sitemap integrity: absolute unique URLs on baseURL, lastmod everywhere, every published page listed,
// no redirect or error pages listed.
const siteBase = new URL(locs[0] ?? "http://x/").origin;
if (new Set(locs).size !== locs.length) fail("sitemap: duplicate URLs");
entries.forEach((e, i) => {
  if (!locs[i].startsWith(siteBase)) fail(`sitemap: URL outside ${siteBase}: ${locs[i]}`);
  if (!/<lastmod>/.test(e)) fail(`sitemap: missing lastmod for ${locs[i]}`);
});
for (const f of files.filter((f) => f.endsWith(`${path.sep}index.html`))) {
  const rel = f.slice(out.length).replace(/index\.html$/, "").split(path.sep).join("/");
  const isRedirect = /http-equiv="?refresh/i.test(fs.readFileSync(f, "utf8").split("</head>")[0]);
  if (isRedirect) {
    if (urls.includes(rel)) fail(`sitemap: redirect page listed: ${rel}`);
    fail(`site: meta-refresh redirect page generated: ${rel} (use pagination.disableAliases or _redirects)`);
  } else if (!urls.includes(rel)) fail(`sitemap: published page missing: ${rel}`);
}
if (urls.some((u) => u.includes("404"))) fail("sitemap: 404 page listed");
urls.push("/pagina-que-nao-existe/");
console.log(`pages: ${urls.length}`);

const viewports = { desktop: { width: 1280, height: 900 }, mobile: { width: 375, height: 812 } };
const browser = await chromium.launch();
const linksSeen = new Set();
const seoSeen = { title: {}, desc: {} };
for (const [vpName, viewport] of Object.entries(viewports)) {
  // Reduced motion: axe must evaluate the final visual state, not frames of entrance animations.
  const ctx = await browser.newContext({ viewport, colorScheme: "light", reducedMotion: "reduce" });
  for (const u of urls) {
    const page = await ctx.newPage();
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    page.on("pageerror", (e) => errors.push(e.message));
    const resp = await page.goto(base + u, { waitUntil: "networkidle" });
    const expected = u === "/pagina-que-nao-existe/" ? 404 : 200;
    if (resp.status() !== expected) fail(`${vpName} ${u}: status ${resp.status()}`);
    if (expected === 200) {
      const canon = await page.$eval('link[rel="canonical"]', (l) => l.getAttribute("href")).catch(() => "");
      if (canon !== siteBase + u) fail(`sitemap: canonical ${canon} differs from sitemap URL ${siteBase + u}`);
    }
    for (const e of errors) if (!(expected === 404 && /status of 404/.test(e))) fail(`${vpName} ${u}: console error: ${e}`);
    // Every article page must use the article layout: JSON-LD Article and the call to action.
    if (articleRe.test(u)) {
      const ld = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent).join(""));
      if (!ld.includes('"@type":"Article"')) fail(`${vpName} ${u}: article without Article structured data (section type missing?)`);
      if (!(await page.$("aside.cta"))) fail(`${vpName} ${u}: article without call to action`);
      // Meta items on the same row (author, dates, reading time) must share the text baseline.
      const bottoms = await page.$$eval(".page-meta > *", (els) =>
        els.map((e) => { const r = document.createRange(); r.selectNodeContents(e); const rs = [...r.getClientRects()]; return { top: e.getBoundingClientRect().top, bottom: rs.at(-1)?.bottom ?? 0 }; }));
      const row = bottoms.filter((x) => Math.abs(x.top - bottoms[0]?.top) < 12);
      if (row.length > 1 && Math.max(...row.map((x) => x.bottom)) - Math.min(...row.map((x) => x.bottom)) > 1) fail(`${vpName} ${u}: page meta items not on the same text line ${JSON.stringify(row)}`);
    }
    // Raw Markdown leaking into the rendered text means broken source content.
    const raw = await page.evaluate(() => document.querySelector("main")?.innerText.match(/(^|\s)#{2,6} \S|\\n|\bn{2}#{2}/)?.[0]);
    if (raw) fail(`${vpName} ${u}: raw Markdown visible in page text (${JSON.stringify(raw)})`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 0) fail(`${vpName} ${u}: horizontal overflow of ${overflow}px`);
    // Touch targets on mobile: at least 24px tall (WCAG 2.5.8) without relying on the spacing
    // exception. Links inside running text are exempt (WCAG "inline" exception), and so are card
    // heading links, whose ::after stretches the target over the whole card.
    if (vpName === "mobile") {
      const small = await page.evaluate(() =>
        [...document.querySelectorAll("a[href], button, summary, input:not([type=hidden]), select, textarea")]
          .filter((el) => !el.closest(".prose p, .prose li, .prose td") && !el.matches(".card .card-title a") && el.checkVisibility())
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > 1 && r.height > 1 && (r.height < 24 || r.width < 24))
          .map(({ el, r }) => `${el.parentElement?.closest("[class]")?.className ?? ""} > ${el.tagName.toLowerCase()}${el.className ? "." + [...el.classList].join(".") : ""} "${el.textContent.trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`),
      );
      for (const s of small) fail(`${vpName} ${u}: touch target under 24px: ${s}`);
    }
    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"]).analyze();
    for (const v of axe.violations) fail(`${vpName} ${u}: axe ${v.id} (${v.impact}): ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(" ")}`);
    // SEO and metadata (once per page, desktop pass).
    if (vpName === "desktop" && expected === 200) {
      const seo = await page.evaluate(() => {
        const meta = (sel) => document.querySelector(sel)?.getAttribute("content") ?? "";
        const ld = [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => s.textContent);
        return {
          title: document.title,
          desc: meta('meta[name="description"]'),
          canonical: document.querySelector('link[rel="canonical"]')?.href ?? "",
          ogImage: meta('meta[property="og:image"]'),
          h1: document.querySelectorAll("h1").length,
          ld,
        };
      });
      if (!seo.title || [...seo.title].length > 65) fail(`seo ${u}: title length ${[...seo.title].length} (max 65): ${seo.title}`);
      if ([...seo.desc].length < 50 || [...seo.desc].length > 170) fail(`seo ${u}: description length ${[...seo.desc].length} (50 to 170)`);
      if (!seo.canonical) fail(`seo ${u}: missing canonical`);
      if (seo.h1 !== 1) fail(`seo ${u}: ${seo.h1} h1 elements`);
      if (!seo.ogImage) fail(`seo ${u}: missing og:image`);
      else {
        const r = await fetch(base + new URL(seo.ogImage).pathname);
        if (r.status !== 200) fail(`seo ${u}: og:image returns ${r.status}`);
      }
      try {
        const types = seo.ld.flatMap((t) => JSON.parse(t)["@graph"] ?? []).map((n) => n["@type"]);
        if (!types.some((t) => /Page$/.test(t))) fail(`seo ${u}: JSON-LD without a WebPage node`);
      } catch (e) {
        fail(`seo ${u}: invalid JSON-LD (${e.message})`);
      }
      seoSeen.title[seo.title] = [...(seoSeen.title[seo.title] ?? []), u];
      seoSeen.desc[seo.desc] = [...(seoSeen.desc[seo.desc] ?? []), u];
    }
    if (vpName === "desktop") for (const href of await page.$$eval("a[href^='/']", (as) => as.map((a) => a.getAttribute("href")))) linksSeen.add(href.split("#")[0]);
    if (shots) {
      fs.mkdirSync(shots, { recursive: true });
      const name = `${vpName}${u.replaceAll("/", "_") || "_"}`.replace(/_+$/, "") || vpName;
      await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
    }
    await page.close();
  }
  // Dark mode spot check on home for contrast.
  const dark = await browser.newContext({ viewport, colorScheme: "dark", reducedMotion: "reduce" });
  const dp = await dark.newPage();
  await dp.goto(`${base}/`, { waitUntil: "networkidle" });
  const axeDark = await new AxeBuilder({ page: dp }).withTags(["wcag2aa"]).analyze();
  for (const v of axeDark.violations) fail(`${vpName} dark /: axe ${v.id}: ${v.nodes.length} node(s), e.g. ${v.nodes[0]?.target.join(" ")}`);
  if (shots) await dp.screenshot({ path: path.join(shots, `${vpName}_dark_home.png`), fullPage: true });
  await dark.close();
  await ctx.close();
}

// ---------- Site-wide SEO ----------
for (const [kind, map] of Object.entries(seoSeen)) for (const [v, us] of Object.entries(map)) if (us.length > 1) fail(`seo: duplicate ${kind} on ${us.join(", ")}: ${v}`);
const robots = fs.readFileSync(path.join(out, "robots.txt"), "utf8");
if (!/Disallow: \//.test(robots)) fail("seo: non-production robots.txt must disallow crawling");
const manifestFile = files.find((f) => f.endsWith("site.webmanifest"));
if (manifestFile) {
  try { JSON.parse(fs.readFileSync(manifestFile, "utf8")); } catch { fail("seo: site.webmanifest is not valid JSON"); }
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
