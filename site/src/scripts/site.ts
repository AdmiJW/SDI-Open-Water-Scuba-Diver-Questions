type Language = 'en' | 'zh';
const root = document.documentElement;
const language = () => (root.dataset.language === 'zh' ? 'zh' : 'en') as Language;
const translate = (en: string, zh: string) => language() === 'zh' ? zh : en;

function updateLanguage(next: Language) {
  root.dataset.language = next;
  root.lang = next === 'zh' ? 'zh-CN' : 'en';
  document.querySelectorAll<HTMLButtonElement>('[data-language-choice]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.languageChoice === next)));
  document.querySelectorAll<HTMLElement>('[data-aria-en]').forEach((element) => element.setAttribute('aria-label', (next === 'zh' ? element.dataset.ariaZh : element.dataset.ariaEn) ?? ''));
  document.querySelectorAll<HTMLInputElement>('[data-placeholder-en]').forEach((element) => { element.placeholder = (next === 'zh' ? element.dataset.placeholderZh : element.dataset.placeholderEn) ?? ''; });
  try { localStorage.setItem('sdi-language', next); } catch { /* The toggle still works when storage is unavailable. */ }
  document.dispatchEvent(new CustomEvent('sdi:language'));
}

document.querySelectorAll<HTMLButtonElement>('[data-language-choice]').forEach((button) => button.addEventListener('click', () => updateLanguage(button.dataset.languageChoice as Language)));
updateLanguage(language());

const dialog = document.querySelector<HTMLDialogElement>('#search-dialog')!;
const input = document.querySelector<HTMLInputElement>('#search-input')!;
const searchStatus = document.querySelector<HTMLElement>('#search-status')!;
const resultsList = document.querySelector<HTMLOListElement>('#search-results')!;
let returnFocus: HTMLElement | null = null;
let requestId = 0;
let timer: ReturnType<typeof setTimeout>;

interface SearchData { url: string; excerpt: string; meta: { title?: string }; sub_results?: { url: string; title: string; excerpt: string }[]; }
interface Pagefind { options: (options: { baseUrl: string }) => Promise<void>; search: (query: string) => Promise<{ results: { data: () => Promise<SearchData> }[] }>; }
let searchPromise: Promise<Pagefind> | undefined;
const base = document.body.dataset.base!;

async function getSearch() {
  searchPromise ??= (async () => {
    const search: Pagefind = await import(/* @vite-ignore */ `${base}pagefind/pagefind.js`);
    await search.options({ baseUrl: base });
    return search;
  })().catch((error) => { searchPromise = undefined; throw error; });
  return searchPromise;
}

function emptySearch() {
  resultsList.replaceChildren();
  searchStatus.textContent = translate('Try “buoyancy”, “压力”, or a question number.', '试试搜索“浮力”、“buoyancy”，或问题编号。');
}

function openSearch() {
  if (dialog.open) return;
  returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  dialog.showModal();
  document.body.classList.add('search-open');
  input.focus();
  if (!input.value.trim()) emptySearch();
}

document.querySelectorAll('[data-open-search]').forEach((button) => button.addEventListener('click', openSearch));
document.querySelector('[data-close-search]')!.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) { const bounds = dialog.getBoundingClientRect(); if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close(); } });
dialog.addEventListener('close', () => { document.body.classList.remove('search-open'); returnFocus?.focus(); });
document.addEventListener('keydown', (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable)) return;
  if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); openSearch(); }
});

async function runSearch() {
  const currentRequest = ++requestId;
  const query = input.value.trim();
  if (!query) { emptySearch(); return; }
  searchStatus.textContent = translate('Looking below the surface…', '正在探索水面之下…');
  resultsList.replaceChildren();
  try {
    const search = await getSearch();
    const result = await search.search(query);
    const data = await Promise.all(result.results.map((entry) => entry.data()));
    if (currentRequest !== requestId) return;
    searchStatus.textContent = data.length ? translate(`${data.length} ${data.length === 1 ? 'note' : 'notes'} found`, `找到 ${data.length} 篇笔记`) : translate(`No notes found for “${query}”. Try another word.`, `未找到“${query}”的相关笔记，请尝试其他关键词。`);
    for (const item of data) {
      const match = item.sub_results?.find((sub) => sub.url.includes('#'));
      const row = document.createElement('li');
      const link = document.createElement('a');
      link.href = match?.url ?? item.url;
      const title = document.createElement('strong');
      title.textContent = item.meta.title ?? translate('Study note', '学习笔记');
      if (match) { const heading = document.createElement('span'); heading.className = 'result-heading'; heading.textContent = match.title; link.append(title, heading); } else link.append(title);
      const excerpt = document.createElement('p');
      // Pagefind returns an escaped excerpt containing only its own <mark> tags.
      excerpt.innerHTML = match?.excerpt ?? item.excerpt;
      link.append(excerpt);
      row.append(link);
      resultsList.append(row);
    }
  } catch {
    if (currentRequest === requestId) searchStatus.textContent = translate('Search couldn’t load. Check your connection and try again.', '搜索暂时无法加载，请检查网络连接后重试。');
  }
}

document.querySelector('#search-form')!.addEventListener('submit', (event) => { event.preventDefault(); clearTimeout(timer); void runSearch(); });
input.addEventListener('input', () => { ++requestId; clearTimeout(timer); timer = setTimeout(() => { void runSearch(); }, 180); });
document.addEventListener('sdi:language', () => { if (dialog.open) { clearTimeout(timer); void runSearch(); } });

// Keep a quiet visual marker on the question currently in view.
const questionLinks = [...document.querySelectorAll<HTMLAnchorElement>('.page-outline a[href^="#"]')];
if ('IntersectionObserver' in window && questionLinks.length) {
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting);
    if (!visible.length) return;
    const id = visible[0].target.id;
    for (const link of questionLinks) {
      if (decodeURIComponent(link.hash.slice(1)) === id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }, { rootMargin: '-15% 0px -65% 0px' });
  questionLinks.forEach((link) => { const heading = document.getElementById(decodeURIComponent(link.hash.slice(1))); if (heading) observer.observe(heading); });
}
