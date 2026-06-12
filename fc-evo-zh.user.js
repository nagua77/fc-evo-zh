// ==UserScript==
// @name         FC26 进化中文名（fut.gg）
// @name:en      FC26 Evolution Chinese Names for fut.gg
// @namespace    https://github.com/nagua77/fc-evo-zh
// @version      0.1.0
// @description  在 fut.gg 显示 EA 官方简体中文进化名称（进化列表 / 详情 / Evo Lab）
// @description:en  Show EA's official Simplified Chinese Evolution names on fut.gg
// @author       nagua77
// @license      MIT
// @match        https://www.fut.gg/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      cdn.jsdelivr.net
// @connect      fastly.jsdelivr.net
// @connect      raw.githubusercontent.com
// @run-at       document-end
// @noframes
// @updateURL    https://cdn.jsdelivr.net/gh/nagua77/fc-evo-zh@main/fc-evo-zh.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/nagua77/fc-evo-zh@main/fc-evo-zh.user.js
// ==/UserScript==

(function () {
  'use strict';

  // 译名数据三级回退链（大陆可用性优先）
  const DATA_URLS = [
    'https://cdn.jsdelivr.net/gh/nagua77/fc-evo-zh@main/data/evo-names.zh.json',
    'https://fastly.jsdelivr.net/gh/nagua77/fc-evo-zh@main/data/evo-names.zh.json',
    'https://raw.githubusercontent.com/nagua77/fc-evo-zh/main/data/evo-names.zh.json',
  ];
  const CACHE_KEY = 'evoDataCache';
  const ENABLED_KEY = 'enabled';
  const TTL_MS = 8 * 60 * 60 * 1000; // 8h，stale-while-revalidate
  const FETCH_TIMEOUT_MS = 10 * 1000;

  const log = (...a) => console.debug('[fc-evo-zh]', ...a);

  // 与 evozh/store.py 的 norm() 保持逐字节一致（共享测试向量 tests/test_norm.py）
  const norm = (s) => s
    .replace(/\u00a0/g, ' ')
    .replace(/[\u2018\u2019\u0060]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  let enabled = GM_getValue(ENABLED_KEY, true);
  let byId = new Map();   // futggId(str) -> [zh, en]
  let byName = new Map(); // norm(en) -> zh

  function buildMaps(data) {
    byId = new Map(Object.entries(data.byId || {}));
    byName = new Map(Object.entries(data.byName || {}));
    log(`数据就绪：byId=${byId.size} byName=${byName.size} updatedAt=${data.updatedAt}`);
  }

  // ------------------------------------------------------------ 数据加载

  function gmFetch(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: 'GET',
        url,
        timeout: FETCH_TIMEOUT_MS,
        onload: (r) => (r.status === 200 ? resolve(r.responseText) : reject(new Error(`HTTP ${r.status}`))),
        onerror: () => reject(new Error('network error')),
        ontimeout: () => reject(new Error('timeout')),
      });
    });
  }

  async function refreshData(force) {
    const cached = GM_getValue(CACHE_KEY, null);
    if (!force && cached && Date.now() - (cached.fetchedAt || 0) < TTL_MS) return;
    for (const url of DATA_URLS) {
      try {
        const text = await gmFetch(url);
        const data = JSON.parse(text);
        if (!data || typeof data.byId !== 'object') throw new Error('结构异常');
        GM_setValue(CACHE_KEY, { data, fetchedAt: Date.now() });
        buildMaps(data);
        processRoot(document.body);
        log(`已从 ${new URL(url).host} 更新译名数据`);
        return;
      } catch (e) {
        log(`拉取失败 ${url}: ${e.message}`);
      }
    }
    log('所有数据源均失败，沿用本地缓存');
  }

  // ------------------------------------------------------------ DOM 替换

  function injectStyle() {
    const style = document.createElement('style');
    style.textContent = '.evo-zh-en{font-size:.75em;opacity:.65;margin-left:.35em;font-weight:400;}';
    document.head.appendChild(style);
  }

  // 这些容器里的文本不碰；.evo-zh-en 是我们自己的英文辅注
  const SKIP_SELECTOR = 'script,style,noscript,textarea,select,option,svg,code,.evo-zh-en';

  function shouldSkip(el) {
    return !el || !!el.closest(SKIP_SELECTOR);
  }

  function rewriteTextNode(node, zh, en) {
    const parent = node.parentElement;
    if (!parent) return;
    node.nodeValue = zh;
    const span = document.createElement('span');
    span.className = 'evo-zh-en';
    span.textContent = en;
    parent.insertBefore(span, node.nextSibling);
    parent.setAttribute('data-evo-zh', '1');
  }

  // 锚点遍：按 /evolutions/{id}- 链接精确命中（解决跨赛季英文重名歧义）。
  // 用英文名在链接内部定位「名称文本节点」，避免误改 "+25 OVR" 等兄弟文本。
  function processAnchors(root) {
    if (!root.querySelectorAll) return;
    const anchors = root.querySelectorAll('a[href^="/evolutions/"], a[href^="https://www.fut.gg/evolutions/"]');
    for (const a of anchors) {
      const m = (a.getAttribute('href') || '').match(/\/evolutions\/(\d+)[-/]/);
      if (!m) continue;
      const entry = byId.get(m[1]);
      if (!entry) continue; // 未收录官方译名 → 保持英文
      const [zh, en] = entry;
      const target = norm(en);
      const tw = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = tw.nextNode())) {
        if (shouldSkip(n.parentElement)) continue;
        if (norm(n.nodeValue || '') === target) {
          rewriteTextNode(n, zh, en);
          break;
        }
      }
    }
  }

  // 文本遍：整节点精确匹配（禁止子串替换，防上千名字误伤）。
  // 覆盖无链接处：Evo Lab 选择器、详情页 h1 等；不依赖 fut.gg 的混淆类名。
  function processTextNodes(root) {
    const base = root.nodeType === Node.TEXT_NODE ? root.parentElement : root;
    if (!base) return;
    const tw = document.createTreeWalker(base, NodeFilter.SHOW_TEXT);
    let n;
    while ((n = tw.nextNode())) {
      if (shouldSkip(n.parentElement)) continue;
      const raw = n.nodeValue || '';
      const zh = byName.get(norm(raw));
      if (zh) rewriteTextNode(n, zh, raw.trim());
    }
  }

  function updateTitle() {
    const m = location.pathname.match(/^\/evolutions\/(\d+)-/);
    if (!m) return;
    const entry = byId.get(m[1]);
    if (entry && !document.title.startsWith(entry[0])) {
      document.title = `${entry[0]} | ${document.title}`;
    }
  }

  function processRoot(root) {
    if (!enabled || !root || (byId.size === 0 && byName.size === 0)) return;
    processAnchors(root);
    processTextNodes(root);
    updateTitle();
  }

  // ------------------------------------------------------------ SPA 监听

  // fut.gg 客户端水合 + Evo Lab 纯 XHR 渲染，必须监听 DOM 变化。
  // 我们自己的改写也会触发回调，但 processRoot 幂等（改写后的中文文本
  // 不再命中英文索引；辅注 span 被 SKIP_SELECTOR 排除），一轮后稳定。
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    if (debounceTimer) return;
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      processRoot(document.body);
    }, 200);
  });

  // ------------------------------------------------------------ 启动

  function init() {
    injectStyle();
    GM_registerMenuCommand('强制更新译名数据', () => refreshData(true));
    GM_registerMenuCommand(enabled ? '停用中文显示' : '启用中文显示', () => {
      GM_setValue(ENABLED_KEY, !enabled);
      location.reload();
    });
    if (!enabled) return;

    const cached = GM_getValue(CACHE_KEY, null);
    if (cached && cached.data) {
      buildMaps(cached.data); // 先用缓存立即渲染，页面零阻塞
      processRoot(document.body);
    }
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    refreshData(false); // 后台按 TTL 静默更新
  }

  init();
})();
