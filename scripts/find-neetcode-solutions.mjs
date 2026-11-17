// Finds which questions have a NeetCode solution page and writes their slugs to
// src/data/neetcode.json. NeetCode serves solutions at /solutions/<leetcode-slug>;
// a slug it doesn't cover returns its generic site shell instead of a 404, so a
// page counts only when its <title> names a solution.
//
// Usage: node scripts/find-neetcode-solutions.mjs
import { readFileSync, writeFileSync } from "fs";

const QUESTIONS = "src/data/questions.json";
const OUT = "src/data/neetcode.json";
const CONCURRENCY = 4;

const { data } = JSON.parse(readFileSync(QUESTIONS, "utf-8"));
const slugs = data.map((q) => q.slug);

async function hasSolution(slug) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`https://neetcode.io/solutions/${slug}`, {
        headers: { "User-Agent": "yeetcode-patterns-neetcode-check" },
      });
      const html = await res.text();
      const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
      return /Solution &amp; Explanation \| NeetCode|Solution & Explanation \| NeetCode/.test(title);
    } catch {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error(`Could not check ${slug}`);
}

const found = [];
let next = 0;
async function worker() {
  while (next < slugs.length) {
    const slug = slugs[next++];
    if (await hasSolution(slug)) found.push(slug);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

found.sort();
writeFileSync(OUT, JSON.stringify({ checked: new Date().toISOString().slice(0, 10), slugs: found }, null, 2) + "\n");
console.log(`${found.length} of ${slugs.length} questions have a NeetCode solution page; wrote ${OUT}`);
