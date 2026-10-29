import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverNotes } from '../src/lib/content.mjs';

const site = new URL('../', import.meta.url);
const dist = fileURLToPath(new URL('dist/', site));
const notes = await discoverNotes(new URL('../', site));
const base = '/SDI-Open-Water-Scuba-Diver-Questions/';
const notesDirectory = join(dist, 'notes');
const pageDirectories = await readdir(notesDirectory);
assert.equal(pageDirectories.length, notes.length, 'Generated pages must match root notes');
let questions = 0;
for (const note of notes) {
  const html = await readFile(join(notesDirectory, note.id, 'index.html'), 'utf8');
  const headingCount = [...html.matchAll(/<h2\b[^>]*>问题\s*\d+<\/h2>/g)].length;
  assert.equal(headingCount, note.questionCount, `Question count mismatch in ${note.filename}`);
  questions += headingCount;
  assert.ok(html.includes('data-pagefind-body'), `Searchable content missing in ${note.filename}`);
  assert.ok(html.includes('lang="zh-CN"'), `Chinese language marker missing in ${note.filename}`);
  await checkLinks(html, `notes/${note.id}/index.html`);
}
const home = await readFile(join(dist, 'index.html'), 'utf8');
for (const note of notes) assert.ok(home.includes(`${base}notes/${note.id}/`));
await checkLinks(home, 'index.html');
await access(join(dist, 'pagefind', 'pagefind.js'));
if (notes.some((note) => note.filename === 'Chapter 5.md')) {
  const chapter = await readFile(join(notesDirectory, 'chapter-5', 'index.html'), 'utf8');
  assert.ok(chapter.includes('katex'), 'Chapter 5 equations must render with KaTeX');
  assert.ok(chapter.includes('<table>'), 'Chapter 5 tables must render');
}
console.log(`Verified ${notes.length} note pages, ${questions} questions, local links, heading anchors, tables, math, and search bundle.`);

async function checkLinks(html, current) {
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const href = match[1].replaceAll('&amp;', '&');
    if (/^(?:https?:|data:|mailto:|javascript:)/.test(href)) continue;
    const target = new URL(href, `https://example.test${base}${current}`);
    assert.ok(target.pathname.startsWith(base), `URL escapes repository base: ${href}`);
    const relative = decodeURIComponent(target.pathname.slice(base.length));
    const filename = join(dist, relative, relative.endsWith('/') || !relative ? 'index.html' : '');
    await access(filename).catch(() => { throw new Error(`Missing local link: ${href} from ${current}`); });
    if (target.hash && filename.endsWith('.html')) {
      const destination = await readFile(filename, 'utf8');
      const id = decodeURIComponent(target.hash.slice(1));
      assert.ok(destination.includes(`id="${id}"`), `Missing anchor ${href} from ${current}`);
    }
  }
}
