import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rename, unlink, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { discoverNotes, isNote, noteId } from '../src/lib/content.mjs';

async function fixture(run) {
  const directory = await mkdtemp(join(tmpdir(), 'sdi-notes-test-'));
  const root = pathToFileURL(`${directory}/`);
  try { await run(directory, root); } finally { await rm(directory, { recursive: true, force: true }); }
}

test('only root study notes are published; repository documents are excluded case-insensitively', () => {
  for (const file of ['README.md', 'readme.MD', 'AGENTS.md', 'CONTRIBUTING.md', 'CHANGELOG.md', 'LICENSE.md', 'folder/private.md', 'site\\readme.md']) assert.equal(isNote(file), false, file);
  assert.equal(isNote('Chapter 14.md'), true);
  assert.equal(isNote('浮力笔记.md'), true);
  assert.equal(noteId('Chapter 14.md'), 'chapter-14');
});

test('new, updated, renamed, and deleted files are discovered without frontmatter', async () => fixture(async (directory, root) => {
  const original = join(directory, 'Extra Notes.md');
  await writeFile(original, '# 问题 65\n## Discussion\n浮力 buoyancy');
  let notes = await discoverNotes(root);
  assert.equal(notes[0].id, 'extra-notes');
  assert.equal(notes[0].questionCount, 1);
  await writeFile(original, '# 问题 65\n\n# 问题 66');
  notes = await discoverNotes(root);
  assert.equal(notes[0].questionCount, 2);
  await rename(original, join(directory, 'Renamed Notes.md'));
  assert.equal((await discoverNotes(root))[0].id, 'renamed-notes');
  await unlink(join(directory, 'Renamed Notes.md'));
  assert.deepEqual(await discoverNotes(root), []);
}));

test('chapters sort numerically and nested notes are not published', async () => fixture(async (directory, root) => {
  for (const file of ['Chapter 10.md', 'Chapter 2.md', 'Appendix.md', 'README.md']) await writeFile(join(directory, file), '# 问题 1');
  await mkdir(join(directory, 'nested'));
  await writeFile(join(directory, 'nested', 'Private.md'), '# Private');
  assert.deepEqual((await discoverNotes(root)).map((note) => note.title), ['Chapter 2', 'Chapter 10', 'Appendix']);
}));

test('colliding URL slugs fail rather than overwrite a page', async () => fixture(async (directory, root) => {
  await writeFile(join(directory, 'Extra Notes.md'), '# One');
  await writeFile(join(directory, 'Extra-Notes.md'), '# Two');
  await assert.rejects(discoverNotes(root), /Duplicate note slug "extra-notes"/);
}));
