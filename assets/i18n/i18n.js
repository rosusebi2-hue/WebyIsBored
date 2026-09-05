(() => {
  'use strict';
  const languages = { en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', ro: 'Română', ru: 'Русский' };
  const locales = Object.keys(languages), rows = globalThis.WEBY_TRANSLATIONS || [], dictionary = new Map(), folded = new Map(), patterns = [];
  const normalize = value => String(value ?? '').replace(/\s+/g, ' ').trim();
  const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const row of rows) {
    const key = normalize(row[0]); dictionary.set(key, row); folded.set(key.toLowerCase(), row);
    if (/\{\w+\}/.test(key)) {
      const names = [], parts = key.split(/(\{\w+\})/g);
      const source = parts.map(part => /^\{\w+\}$/.test(part) ? (names.push(part.slice(1, -1)), '(.+?)') : escape(part)).join('');
      patterns.push({ row, names, regex: new RegExp(`^${source}$`, 'i'), weight: key.replace(/\{\w+\}/g, '').length });
    }
  }
  patterns.sort((a, b) => b.weight - a.weight);
  let locale = 'en', pickerId = 0;
  try { const requested = new URL(location.href).searchParams.get('lang'), saved = localStorage.getItem('weby.language'); locale = locales.includes(requested) ? requested : locales.includes(saved) ? saved : 'en'; }
  catch { try { const requested = new URL(location.href).searchParams.get('lang'); if (locales.includes(requested)) locale = requested; } catch {} }
  function translate(value, params, depth = 0) {
    const original = String(value ?? ''), key = normalize(original);
    if (!key || depth > 4) return original;
    const index = locales.indexOf(locale);
    let row = dictionary.get(key), result;
    if (row) result = row[index] || row[0];
    else if ((row = folded.get(key.toLowerCase()))) {
      result = row[index] || row[0];
      if (key === key.toUpperCase()) result = result.toLocaleUpperCase(locale);
    } else if (locale !== 'en') {
      for (const pattern of patterns) {
        const match = key.match(pattern.regex); if (!match) continue;
        result = (pattern.row[index] || pattern.row[0]).replace(/\{(\w+)\}/g, (_, name) => translate(match[pattern.names.indexOf(name) + 1], undefined, depth + 1));
        if (key === key.toUpperCase()) result = result.toLocaleUpperCase(locale);
        break;
      }
      if (!result && key.includes(' · ')) result = key.split(' · ').map(part => translate(part, undefined, depth + 1)).join(' · ');
    }
    if (locale === 'en') result = original;
    result ??= original;
    if (params) result = result.replace(/\{(\w+)\}/g, (token, name) => String(params[name] ?? token));
    return result;
  }
  const textSources = new WeakMap(), attributeSources = new WeakMap();
  function translateText(node) {
    const current = node.nodeValue, previous = textSources.get(node);
    const source = previous && current === previous.last ? previous.source : current;
    if (!source?.trim()) return;
    const result = translate(source.trim()), next = source.match(/^\s*/)[0] + result + source.match(/\s*$/)[0];
    textSources.set(node, { source, last: next }); if (current !== next) node.nodeValue = next;
  }
  function translateElement(element) {
    if (element.tagName === 'TIME' && /^\d{4}-\d{2}-\d{2}$/.test(element.dateTime)) { const value = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(element.dateTime + 'T12:00:00Z')); if (element.textContent !== value) element.textContent = value; }
    const records = attributeSources.get(element) || {};
    for (const name of ['aria-label', 'title', 'placeholder', 'alt', ...(element.tagName === 'META' && element.name === 'description' ? ['content'] : [])]) {
      const current = element.getAttribute(name); if (!current) continue;
      const source = records[name]?.last === current ? records[name].source : current, next = translate(source);
      records[name] = { source, last: next }; if (current !== next) element.setAttribute(name, next);
    }
    attributeSources.set(element, records);
    if (element.tagName === 'A') {
      const href = element.getAttribute('href');
      if (href && !href.startsWith('#')) try {
        const url = new URL(href, document.baseURI);
        if (url.origin === location.origin && /^https?:$/.test(url.protocol)) {
          if (locale === 'en') url.searchParams.delete('lang'); else url.searchParams.set('lang', locale);
          const next = url.pathname + url.search + url.hash; if (next !== href) element.setAttribute('href', next);
        }
      } catch {}
    }
  }
  function translateDOM(root = document.documentElement) {
    if (root.nodeType === 3) { if (!root.parentElement?.closest('[data-no-i18n],script,style,code,pre,kbd')) translateText(root); return; }
    if (root.nodeType !== 1 || root.matches('[data-no-i18n],script,style,code,pre,kbd')) return;
    translateElement(root); for (const child of root.childNodes) translateDOM(child);
  }
  function setText(element, value) {
    const source = String(value ?? ''); element.textContent = translate(source);
    if (element.firstChild) textSources.set(element.firstChild, { source, last: element.textContent });
  }
  function makeSelector() {
    const label = document.createElement('label'); label.className = 'language-picker';
    const title = document.createElement('span'); setText(title, 'Language'); title.className = 'language-label';
    const select = document.createElement('select'); select.id = `weby-language-${++pickerId}`; select.dataset.webLanguage = ''; select.dataset.noI18n = ''; label.htmlFor = select.id;
    for (const [code, name] of Object.entries(languages)) { const option = document.createElement('option'); option.value = code; option.textContent = name; option.lang = code; select.append(option); }
    select.value = locale; select.addEventListener('change', () => setLanguage(select.value)); label.append(title, select); return label;
  }
  function setLanguage(next) {
    if (!locales.includes(next)) return false; locale = next;
    try { localStorage.setItem('weby.language', locale); } catch {}
    try { const url = new URL(location.href); if (locale === 'en') url.searchParams.delete('lang'); else url.searchParams.set('lang', locale); history.replaceState(history.state, '', url); } catch {}
    document.documentElement.lang = locale;
    translateDOM(); document.querySelectorAll('[data-web-language]').forEach(select => select.value = locale);
    window.dispatchEvent(new CustomEvent('weby:language', { detail: { locale } })); return true;
  }
  function init() {
    document.documentElement.lang = locale;
    document.querySelectorAll('[data-language-slot]').forEach(slot => slot.append(makeSelector()));
    translateDOM();
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'characterData') translateDOM(record.target);
        else if (record.type === 'attributes') translateElement(record.target);
        else record.addedNodes.forEach(node => translateDOM(node));
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['aria-label', 'title', 'placeholder', 'alt', 'href'] });
  }
  globalThis.WebyI18n = { t: translate, setText, translateDOM, makeSelector, setLanguage, languages, get locale() { return locale; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
