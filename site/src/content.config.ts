import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { discoverNotes, noteId } from './lib/content.mjs';

const root = new URL('../../', import.meta.url);
// Validate before the loader can silently replace an entry with a colliding ID.
const notes = await discoverNotes(root);

export const collections = {
  notes: defineCollection({
    loader: glob({
      base: root,
      pattern: notes.map((note: { filename: string }) => note.filename.replace(/[\[\]{}()*?!+@]/g, '\\$&')),
      generateId: ({ entry }) => noteId(entry),
    }),
  }),
};
