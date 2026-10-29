import { readdir, readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { slug } from 'github-slugger';

const repositoryDocuments = new Set(['readme.md', 'agents.md', 'contributing.md', 'changelog.md', 'license.md']);

export function isNote(filename) {
  return !filename.includes('/') && !filename.includes('\\') && /\.md$/i.test(filename) && !repositoryDocuments.has(filename.toLowerCase());
}

export function noteId(filename) {
  return slug(basename(filename).replace(/\.md$/i, ''));
}

export function describeNote(filename, body) {
  const numbers = [...body.matchAll(/^#\s+问题\s+(\d+)\s*$/gm)].map((match) => Number(match[1]));
  return {
    id: noteId(filename), filename, title: filename.replace(/\.md$/i, ''),
    chapter: /^Chapter\s+(\d+)\.md$/i.test(filename) ? Number(filename.match(/^Chapter\s+(\d+)/i)[1]) : null,
    questionCount: numbers.length, firstQuestion: numbers[0] ?? null, lastQuestion: numbers.at(-1) ?? null,
  };
}

export function sortNotes(notes) {
  return notes.sort((a, b) => (a.chapter ?? Infinity) - (b.chapter ?? Infinity) || a.title.localeCompare(b.title, 'en', { numeric: true }));
}

export async function discoverNotes(root) {
  const entries = await readdir(root, { withFileTypes: true });
  const seen = new Map();
  const notes = [];
  for (const entry of entries) {
    if (!entry.isFile() || !isNote(entry.name)) continue;
    const id = noteId(entry.name);
    if (!id) throw new Error(`Cannot create a page slug for ${entry.name}`);
    if (seen.has(id)) throw new Error(`Duplicate note slug "${id}": ${seen.get(id)} and ${entry.name}`);
    seen.set(id, entry.name);
    const body = await readFile(new URL(encodeURIComponent(entry.name), root), 'utf8');
    notes.push(describeNote(entry.name, body));
  }
  return sortNotes(notes);
}
