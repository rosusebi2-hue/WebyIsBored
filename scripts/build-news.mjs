import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const posts = JSON.parse(readFileSync(root + 'assets/hub/news.json', 'utf8'));
const escape = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
if (new Set(posts.map(x => x.id)).size !== posts.length) throw new Error('News IDs must be unique.');
const articles = posts.map(p => {
  if (!/^[a-z0-9-]+$/.test(p.id) || !/^\d{4}-\d{2}-\d{2}$/.test(p.date) || !/^\.\.\/(?:[a-z0-9/-]*)$/.test(p.link)) throw new Error('Invalid news metadata.');
  const date = new Date(p.date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  return `<article class="news-entry${p.featured ? ' featured-release' : ''} reveal" id="${p.id}">
    <div class="news-rail"><time datetime="${p.date}">${date}</time><span class="news-type">${escape(p.type)}</span>${p.version ? `<span class="news-version">v${escape(p.version)}</span>` : ''}</div>
    <div class="news-body"><p class="news-game">${escape(p.game)}</p><h2>${escape(p.title)}</h2><p class="news-summary">${escape(p.summary)}</p>
    ${p.sections.map(s => `<section class="patch-section"><h3>${escape(s.title)}</h3>${s.paragraph ? `<p>${escape(s.paragraph)}</p>` : ''}${s.items ? `<ul>${s.items.map(i => `<li>${escape(i)}</li>`).join('')}</ul>` : ''}</section>`).join('\n')}
    <a class="news-play" href="${escape(p.link)}">${escape(p.linkLabel)} <span aria-hidden="true">↗</span></a></div>
  </article>`;
}).join('\n');
const path = root + 'news/index.html';
const page = readFileSync(path, 'utf8');
const start = '<!-- NEWS:START -->', end = '<!-- NEWS:END -->';
if (!page.includes(start) || !page.includes(end)) throw new Error('News template markers missing.');
writeFileSync(path, page.slice(0, page.indexOf(start) + start.length) + '\n' + articles + '\n' + page.slice(page.indexOf(end)));
console.log(`Rendered ${posts.length} news posts.`);
