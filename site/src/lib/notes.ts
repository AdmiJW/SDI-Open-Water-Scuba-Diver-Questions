import { getCollection } from 'astro:content';
import { basename } from 'node:path';
import { describeNote, sortNotes } from './content.mjs';

export async function getNotes() {
  const entries = await getCollection('notes');
  return sortNotes(entries.map((entry) => {
    if (!entry.filePath) throw new Error(`Missing source path for ${entry.id}`);
    const metadata: NoteMetadata = describeNote(basename(entry.filePath), entry.body ?? '');
    return { ...metadata, entry };
  })) as (NoteMetadata & { entry: (typeof entries)[number] })[];
}

export interface NoteMetadata {
  id: string;
  filename: string;
  title: string;
  chapter: number | null;
  questionCount: number;
  firstQuestion: number | null;
  lastQuestion: number | null;
}

export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = (path = '') => `${base}/${path.replace(/^\//, '')}`;
