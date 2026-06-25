// Simple i18n loader: loads /lang/{code}.json and applies translations
(function(){
  const DEFAULT_LANG = 'ms'; // Bahasa Malaysia default
  const STORAGE_KEY = 'site_lang';

  async function loadLang(lang) {
    try {
      const res = await fetch(`/lang/${lang}.json`);
      if (!res.ok) throw new Error('Failed to load language');
      const dict = await res.json();
      applyTranslations(dict);
      // set lang-select if present
      const sel = document.getElementById('lang-select');
      if (sel) sel.value = lang;
      const toggle = document.getElementById('lang-toggle');
      if (toggle) {
        // display both labels and highlight current
        const left = 'Bahasa Melayu';
        const right = 'English';
        if (lang === 'ms') toggle.innerHTML = `<strong>${left}</strong> / ${right}`;
        else toggle.innerHTML = `${left} / <strong>${right}</strong>`;
      }
      localStorage.setItem(STORAGE_KEY, lang);
      // expose current dict and t() helper
      window.__i18n = window.__i18n || {};
      window.__i18n.dict = dict;
      window.__i18n.t = function(key, fallback) {
        const v = lookup(dict, key);
        return v === undefined ? (fallback === undefined ? key : fallback) : v;
      };
    } catch (e) {
      console.warn('i18n load failed for', lang, e);
    }
  }

  function applyTranslations(dict) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const val = lookup(dict, key);
      if (val === undefined) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.placeholder = val;
      } else if (el.tagName === 'OPTION') {
        el.textContent = val;
      } else {
        el.textContent = val;
      }
    });
  }

  function lookup(dict, key) {
    const parts = key.split('.');
    let cur = dict;
    for (const p of parts) {
      if (!cur) return undefined;
      cur = cur[p];
    }
    return cur;
  }

  // language selector wiring
  document.addEventListener('DOMContentLoaded', () => {
    const saved = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
    const sel = document.getElementById('lang-select');
    if (sel) {
      sel.addEventListener('change', (e) => { loadLang(e.target.value); });
    }
    const toggle = document.getElementById('lang-toggle');
    if (toggle) {
      toggle.addEventListener('click', (e) => {
        const current = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
        const next = current === 'ms' ? 'en' : 'ms';
        loadLang(next);
      });
    }
    loadLang(saved);
  });

  // expose for debugging and runtime use
  window.__i18n = window.__i18n || {};
  window.__i18n.loadLang = loadLang;
})();
