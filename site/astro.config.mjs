import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { visit } from 'unist-util-visit';

// Keep source notes untouched while making their question headings sit below the page title.
function questionHeadings() {
  return (tree) => visit(tree, 'heading', (node) => { node.depth = Math.min(node.depth + 1, 6); });
}

export default defineConfig({
  site: 'https://admijw.github.io',
  base: '/SDI-Open-Water-Scuba-Diver-Questions',
  trailingSlash: 'always',
  output: 'static',
  markdown: {
    processor: unified({
      remarkPlugins: [remarkMath, questionHeadings],
      rehypePlugins: [[rehypeKatex, { strict: 'ignore', throwOnError: false }]],
    }),
  },
});
