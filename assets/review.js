/* Показ tkany.com клиенту (GitHub Pages): кнопка «Замечания» справа внизу.
   18 ноя 2026, просьба пользователя: вертикальная полоса «Замечания» у правого края мешала смотреть сайт —
   теперь маленькая кнопка-сообщение в углу, по нажатию выезжает панель.

   Как работает:
   - Замечание запоминается вместе со страницей, блоком страницы и экраном (телефон / компьютер, ширина).
     Блок берётся тот, что сейчас в середине экрана; можно ткнуть в нужное место кнопкой «Указать на странице».
   - Замечания копятся в браузере клиента (localStorage 'cpk7-notes') и переживают переходы между страницами.
   - «Скопировать все» кладёт готовый текст в буфер — клиент вставляет его в Telegram, пользователь пересылает мне.
     На телефоне есть «Отправить…» — системное меню «Поделиться», оттуда сразу в Telegram.
   - Сервера нет: само ничего никуда не уходит.

   Вся разметка и стили — внутри Shadow DOM: стили сайта не трогают панель, а стили панели не трогают сайт.
   Подключает tools/publish_tkany_preview.py, на стенд и на бой не попадает. */
(function(){
  'use strict';
  if (window.__cpk7review) return;
  window.__cpk7review = true;

  var KEY = 'cpk7-notes';
  function load(){ try{ var a = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(a) ? a : []; }catch(e){ return []; } }
  function save(a){ try{ localStorage.setItem(KEY, JSON.stringify(a)); }catch(e){} }
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function clean(s, n){ s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

  /* ── страница, блок, экран ─────────────────────────────────────────── */
  function pageName(){
    var h = document.querySelector('main h1, h1');
    var t = h ? (h.innerText || h.textContent) : document.title.split(/\s[—|]\s/)[0];
    if (location.pathname.replace(/\/+$/, '').split('/').length <= 2) t = 'Главная';
    return clean(t, 70);
  }
  function device(){
    var w = window.innerWidth, h = window.innerHeight;
    var kind = w < 600 ? 'телефон' : (w < 1024 ? 'планшет' : 'компьютер');
    return kind + ' ' + w + '×' + h;
  }
  var BLOCK_SEL = 'section, header, footer, aside, nav, article, form, [data-pdp], .pdp, .plp, .sheet, .drawer, dialog';
  function blockOf(el){
    if (!el || el.nodeType !== 1) return null;
    var b = el.closest(BLOCK_SEL);
    // карточка товара, заголовок секции (header.sec-head), форма внутри секции — это не блок страницы:
    // поднимаемся до секции, а саму карточку называем отдельно
    while (b && b.tagName !== 'SECTION' && b.parentElement && b.parentElement.closest('section')) b = b.parentElement.closest('section');
    if (!b) { b = el; while (b.parentElement && b.parentElement !== document.body && b.parentElement.tagName !== 'MAIN') b = b.parentElement; }
    return b;
  }
  function blockTitle(b){
    if (!b) return '';
    if (b.tagName === 'FOOTER') return 'Подвал';
    if (b.tagName === 'HEADER' || b.classList.contains('head')) return 'Шапка сайта';
    if (b.closest('.drawer, [id^="drawer"]') || b.tagName === 'NAV') return 'Меню';
    // заголовок самого блока, а не карточки внутри него
    var h = [].filter.call(b.querySelectorAll('h1, h2, h3, .t-h2'), function(x){ return !x.closest('.pcard, .scard, article'); })[0];
    var t = (h && (h.innerText || h.textContent)) || b.getAttribute('aria-label') || '';
    if (!t) t = (b.innerText || b.textContent || '').split('\n').filter(function(x){ return x.trim(); })[0] || '';
    return clean(t, 70);
  }
  function blockHint(b){
    if (!b) return '';
    if (b.id) return '#' + b.id;
    var c = String(b.className || '').split(/\s+/).filter(function(x){ return x && !/^(wrap|sec|dark|is-)/.test(x); })[0];
    return b.tagName.toLowerCase() + (c ? '.' + c : '');
  }
  function itemOf(el, b){
    if (!el || !b || el === b) return '';
    var it = el.closest('.pcard, .scard, a, button, label, li, figure, img, p, h1, h2, h3, h4, [class*="price"], .pdp__sws');
    if (!it || it === b || !b.contains(it)) return '';
    var name = it.querySelector && it.querySelector('.pcard__name, .scard__t, h3, h4');
    var t = (name && (name.innerText || name.textContent)) || it.getAttribute('aria-label') || it.getAttribute('alt') || it.innerText || it.textContent;
    return clean(t, 60);
  }
  // места, у которых нет своего заголовка, — называем по-человечески
  var KNOWN = [
    ['.plp__side', 'Фильтры каталога'], ['.plp__bar', 'Панель над товарами (фильтры, вид, сортировка)'],
    ['.pgrid', 'Список товаров'], ['.pdp__gal', 'Фото товара'], ['.pdp__info', 'Цена, цвета и кнопки товара'], ['.mbar-buy, .lmbar', 'Нижняя панель на телефоне'],
    ['.drawer, .drawer-nav, [id^="drawer"]', 'Меню'], ['.search', 'Поиск'], ['.sheet', 'Всплывающая панель'],
    ['.ubar', 'Верхняя полоса'], ['.head', 'Шапка сайта'], ['.plp__main', 'Список товаров'], ['.plp', 'Каталог']
  ];
  function describe(el){
    if (!el || el.nodeType !== 1) return { b: '', h: '', i: '' };
    for (var k = 0; k < KNOWN.length; k++) {
      var z = el.closest(KNOWN[k][0]);
      if (z) return { b: KNOWN[k][1], h: KNOWN[k][0].split(',')[0], i: itemOf(el, z) };
    }
    var b = blockOf(el);
    return { b: blockTitle(b), h: blockHint(b), i: itemOf(el, b) };
  }

  /* ── разметка ─────────────────────────────────────────────────────── */
  var host = document.createElement('div');
  host.id = 'cpk7-review';
  host.setAttribute('style', 'all:initial;position:fixed;inset:auto;z-index:2147483000');
  var root = host.attachShadow ? host.attachShadow({mode: 'open'}) : host;

  var ICON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16v12H9l-5 4z"/><path d="M8 8.5h8M8 12h5" stroke-linecap="round"/></svg>';
  var CSS = '' +
    ':host{all:initial}' +
    '*{box-sizing:border-box;margin:0}' +
    '.w{--ink:#16130F;--cream:#F4F1E8;--paper:#FBF9F3;--yel:#F8F000;--mut:#5b564c;--line:rgba(22,19,15,.16);' +
      'font:15px/1.4 Onest,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}' +
    '.mono{font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace;letter-spacing:.08em;text-transform:uppercase}' +
    'button{font:inherit;color:inherit;cursor:pointer;border-radius:0;-webkit-tap-highlight-color:transparent}' +
    /* кнопка в углу */
    '.fab{position:fixed;right:16px;bottom:calc(16px + var(--lift,0px));z-index:2;width:52px;height:52px;display:grid;place-items:center;border:0;' +
      'background:var(--ink);color:var(--cream);box-shadow:0 6px 20px rgba(0,0,0,.22);transition:background .2s,color .2s,bottom .25s,transform .2s}' +
    '.fab:hover,.fab[aria-expanded=true]{background:var(--yel);color:var(--ink)}' +
    '.fab:active{transform:scale(.96)}' +
    '.fab b{position:absolute;top:-7px;right:-7px;min-width:22px;height:22px;padding:0 5px;display:grid;place-items:center;background:var(--yel);color:var(--ink);' +
      'font:600 11px/1 "IBM Plex Mono",ui-monospace,monospace;border:2px solid var(--ink)}' +
    '.fab b:empty{display:none}' +
    '.tip{position:fixed;right:76px;bottom:calc(28px + var(--lift,0px));z-index:2;padding:7px 10px;background:var(--ink);color:var(--cream);font-size:10.5px;' +
      'white-space:nowrap;opacity:0;pointer-events:none;transform:translateX(6px);transition:opacity .2s,transform .2s}' +
    '.fab:hover + .tip{opacity:1;transform:none}' +
    /* панель */
    '.pan{position:fixed;right:16px;bottom:calc(80px + var(--lift,0px));z-index:3;width:min(400px,calc(100vw - 32px));max-height:calc(100vh - 110px - var(--lift,0px));' +
      'display:flex;flex-direction:column;background:var(--paper);border:1px solid var(--ink);box-shadow:0 18px 50px rgba(0,0,0,.25);' +
      'opacity:0;transform:translateY(12px);visibility:hidden;transition:opacity .2s,transform .25s,visibility 0s .25s}' +
    '.pan.on{opacity:1;transform:none;visibility:visible;transition:opacity .2s,transform .25s}' +
    '.hd{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px 12px;border-bottom:1px solid var(--line)}' +
    '.hd h3{font-weight:400;font-size:20px;letter-spacing:-.02em}' +
    '.x{width:36px;height:36px;border:0;background:none;display:grid;place-items:center;margin:-8px -8px -8px 0}' +
    '.x:hover{background:var(--yel)}' +
    '.bd{padding:14px 16px 16px;overflow:auto;-webkit-overflow-scrolling:touch}' +
    '.ctx{border:1px solid var(--line);background:#fff;padding:10px 12px;font-size:13px;margin-bottom:10px}' +
    '.ctx .k{font-size:10px;color:var(--mut);display:block;margin-bottom:3px}' +
    '.ctx .v{display:block}' +
    '.ctx .v i{font-style:normal;color:var(--mut)}' +
    '.pick{margin-top:8px;border:0;background:none;padding:0;font-size:10.5px;border-bottom:1px solid currentColor}' +
    '.pick:hover{background:var(--yel)}' +
    'textarea{width:100%;min-height:104px;border:1px solid var(--ink);background:#fff;padding:11px 12px;font:16px/1.4 inherit;font-family:inherit;color:var(--ink);resize:vertical;border-radius:0;outline:none;-webkit-appearance:none}' +
    'textarea:focus{box-shadow:0 0 0 3px var(--yel)}' +
    '.row{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}' +
    '.btn{height:42px;padding:0 14px;border:1px solid var(--ink);background:transparent;font-size:10.5px;display:inline-flex;align-items:center;justify-content:center;gap:8px}' +
    '.btn.p{background:var(--ink);color:var(--cream)}' +
    '.btn:hover{background:var(--yel);border-color:var(--yel);color:var(--ink)}' +
    '.btn.g{flex:1 1 auto}' +
    '.ok{min-height:18px;margin-top:8px;color:#1F5C42;font-size:12.5px}' +
    '.lh{display:flex;justify-content:space-between;align-items:baseline;margin:16px 0 0;padding-top:14px;border-top:1px solid var(--line);font-size:10.5px;color:var(--mut)}' +
    'ol{list-style:none;padding:0;margin:8px 0 0;display:grid;gap:8px}' +
    'li{border:1px solid var(--line);background:#fff;padding:9px 10px 9px 12px;font-size:13.5px;position:relative}' +
    'li p{white-space:pre-wrap;word-break:break-word;padding-right:26px}' +
    'li .m{display:block;margin-top:5px;font-size:11.5px;color:var(--mut)}' +
    'li .m a{color:inherit}' +
    'li .del{position:absolute;top:4px;right:4px;width:28px;height:28px;border:0;background:none;color:#b3261e;font-size:18px;line-height:1}' +
    'li .del:hover{background:var(--yel)}' +
    '.ft{padding:12px 16px calc(12px + env(safe-area-inset-bottom));border-top:1px solid var(--line);background:var(--cream)}' +
    '.ft[hidden]{display:none}' +
    '.note{font-size:11.5px;color:var(--mut);margin-top:8px}' +
    /* режим «указать на странице» */
    '.hl{position:fixed;z-index:1;pointer-events:none;outline:3px solid var(--yel);box-shadow:0 0 0 5px var(--ink),0 0 0 9999px rgba(22,19,15,.18);display:none;transition:all .08s}' +
    '.hl i{position:absolute;left:-3px;top:-29px;background:var(--ink);color:var(--cream);font:500 10.5px/1 "IBM Plex Mono",monospace;letter-spacing:.06em;padding:6px 8px;white-space:nowrap;max-width:80vw;overflow:hidden;text-overflow:ellipsis;font-style:normal}' +
    '.bar{position:fixed;left:50%;top:12px;transform:translateX(-50%);z-index:4;display:none;align-items:center;gap:12px;background:var(--ink);color:var(--cream);padding:10px 10px 10px 14px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.25);max-width:calc(100vw - 24px)}' +
    '.bar button{height:34px;padding:0 12px;border:1px solid var(--cream);background:none;color:var(--cream);font-size:10.5px}' +
    '.picking .bar{display:flex}.picking .hl{display:block}.picking .pan,.picking .fab,.picking .tip{display:none}' +
    /* телефон: панель — снизу во всю ширину */
    '@media (max-width:600px){' +
      '.fab{right:12px;bottom:calc(12px + var(--lift,0px));width:48px;height:48px}' +
      '.tip{display:none}' +
      '.pan{left:0;right:0;bottom:0;width:auto;max-height:88vh;border-width:1px 0 0;transform:translateY(100%)}' +
      '.pan.on{transform:none}' +
      '.scrim{position:fixed;inset:0;z-index:2;background:rgba(22,19,15,.35);opacity:0;visibility:hidden;transition:opacity .2s,visibility 0s .2s}' +
      '.open .scrim{opacity:1;visibility:visible;transition:opacity .2s}' +
      '.open .fab{display:none}' +
      '.btn{height:46px}' +
    '}' +
    '@media print{.w{display:none}}';

  root.innerHTML = '<style>' + CSS + '</style>' +
    '<div class="w" part="w">' +
      '<div class="scrim"></div>' +
      '<button class="fab" type="button" aria-expanded="false" aria-label="Замечания к сайту">' + ICON + '<b></b></button>' +
      '<span class="tip mono">Замечания</span>' +
      '<div class="pan" role="dialog" aria-label="Замечания к сайту">' +
        '<div class="hd"><h3>Замечание</h3><button class="x" type="button" data-a="close" aria-label="Закрыть"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="1.8"><path d="M5 5l14 14M19 5L5 19"/></svg></button></div>' +
        '<div class="bd">' +
          '<div class="ctx"><span class="k mono">Где</span><span class="v" data-ctx></span>' +
            '<button class="pick mono" type="button" data-a="pick">Указать место на странице</button></div>' +
          '<textarea placeholder="Что поправить? Например: на телефоне не видно цены"></textarea>' +
          '<div class="row"><button class="btn p g mono" type="button" data-a="add">Добавить замечание</button></div>' +
          '<div class="ok" role="status"></div>' +
          '<div data-list hidden><div class="lh mono"><span>Все замечания</span><span data-n></span></div><ol></ol></div>' +
        '</div>' +
        '<div class="ft" data-ft hidden>' +
          '<div class="row" style="margin-top:0"><button class="btn p g mono" type="button" data-a="copy">Скопировать все</button>' +
          '<button class="btn mono" type="button" data-a="share" hidden>Отправить…</button>' +
          '<button class="btn mono" type="button" data-a="clear">Очистить</button></div>' +
          '<p class="note">Скопируйте и вставьте в Telegram одним сообщением. Замечания хранятся только в этом браузере, пока вы их не очистите.</p>' +
        '</div>' +
      '</div>' +
      '<div class="hl"><i></i></div>' +
      '<div class="bar"><span>Нажмите на место, к которому замечание</span><button class="mono" type="button" data-a="unpick">Отмена</button></div>' +
    '</div>';
  (document.body || document.documentElement).appendChild(host);

  function q(s){ return root.querySelector(s); }
  var W = q('.w'), fab = q('.fab'), badge = q('.fab b'), pan = q('.pan'), ta = q('textarea'), ok = q('.ok'),
      ctxEl = q('[data-ctx]'), list = q('[data-list]'), ol = q('ol'), nEl = q('[data-n]'), ft = q('[data-ft]'),
      hl = q('.hl'), hlLbl = q('.hl i'), shareBtn = q('[data-a="share"]');
  if (navigator.share && window.matchMedia && matchMedia('(pointer:coarse)').matches) shareBtn.hidden = false;

  var ctx = null; // {b, h, i} — блок, к которому будет замечание
  function showCtx(){
    var b = ctx && ctx.b ? '«' + esc(ctx.b) + '»' : 'вся страница';
    ctxEl.innerHTML = esc(pageName()) + ' · ' + b + (ctx && ctx.i ? ' <i>→ ' + esc(ctx.i) + '</i>' : '');
  }
  function centerCtx(){
    // блок в середине видимой части экрана (панель на телефоне закрывает низ — берём точку выше центра)
    var x = Math.round(window.innerWidth / 2), y = Math.round(window.innerHeight * 0.4);
    host.style.display = 'none';
    var el = document.elementFromPoint(x, y);
    host.style.display = '';
    var d = describe(el);
    d.i = ''; // при автоопределении карточку не называем — только блок
    return d;
  }

  function render(){
    var a = load();
    badge.textContent = a.length ? String(a.length) : '';
    list.hidden = !a.length; ft.hidden = !a.length;
    nEl.textContent = a.length ? a.length + ' шт.' : '';
    ol.innerHTML = a.map(function(n, i){
      var where = (n.p || '') + (n.b ? ' · «' + n.b + '»' : '') + (n.i ? ' → ' + n.i : '');
      return '<li><p>' + esc(n.x) + '</p><span class="m"><a href="' + esc(n.u) + '">' + esc(where) + '</a>' + (n.d ? ' · ' + esc(n.d) : '') + '</span>' +
        '<button class="del" type="button" data-del="' + i + '" aria-label="Удалить">×</button></li>';
    }).join('');
  }

  function open(){
    if (!ctx) ctx = centerCtx();
    showCtx();
    W.classList.add('open'); pan.classList.add('on'); fab.setAttribute('aria-expanded', 'true');
    ok.textContent = '';
    if (!matchMedia('(pointer:coarse)').matches) setTimeout(function(){ ta.focus(); }, 60);
  }
  function close(){
    W.classList.remove('open'); pan.classList.remove('on'); fab.setAttribute('aria-expanded', 'false');
    ctx = null;
  }

  function add(){
    var x = ta.value.trim();
    if (!x) { ta.focus(); return false; }
    var a = load();
    a.push({ u: location.href.split('#')[0], p: pageName(), b: ctx && ctx.b || '', h: ctx && ctx.h || '', i: ctx && ctx.i || '', d: device(), t: Date.now(), x: x });
    save(a); ta.value = ''; render();
    ok.textContent = 'Добавлено. Можно листать дальше и переходить на другие страницы — замечания сохранятся.';
    return true;
  }

  function text(a){
    var d = new Date();
    var head = 'Замечания к новому сайту tkany.com — ' + d.toLocaleDateString('ru-RU') + ', ' + a.length + ' шт.';
    return head + '\n\n' + a.map(function(n, i){
      var where = (n.p || 'Страница') + (n.b ? ' — блок «' + n.b + '»' : '') + (n.i ? ' → ' + n.i : '');
      var tech = [n.d, n.h].filter(Boolean).join(' · ');
      return (i + 1) + ') ' + where + '\n' + n.u + (tech ? '\n[' + tech + ']' : '') + '\n' + n.x;
    }).join('\n\n');
  }
  function copy(t){
    function fallback(){
      var tmp = document.createElement('textarea');
      tmp.value = t; tmp.setAttribute('readonly', ''); tmp.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0';
      document.body.appendChild(tmp); tmp.select(); tmp.setSelectionRange(0, t.length);
      var done = false; try{ done = document.execCommand('copy'); }catch(e){}
      document.body.removeChild(tmp);
      return done;
    }
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(t).then(function(){ return true; }, function(){ return fallback(); });
    return Promise.resolve(fallback());
  }
  function flush(){ if (ta.value.trim()) add(); return load(); } // текст в поле, но «Добавить» не нажали — не теряем

  /* ── указать место на странице ─────────────────────────────────────── */
  var picking = false, hoverEl = null;
  function target(e){
    var t = e.target;
    if (t === host || host.contains(t)) return null;
    return t;
  }
  function paint(el){
    var b = blockOf(el); if (!b) return;
    var r = b.getBoundingClientRect();
    var top = Math.max(r.top, 0), bottom = Math.min(r.bottom, window.innerHeight);
    hl.style.left = Math.max(r.left, 0) + 'px'; hl.style.top = top + 'px';
    hl.style.width = Math.min(r.width, window.innerWidth) + 'px'; hl.style.height = Math.max(bottom - top, 0) + 'px';
    hlLbl.textContent = blockTitle(b) || 'Блок';
  }
  function onMove(e){ if (!picking) return; var t = target(e); if (t && t !== hoverEl) { hoverEl = t; paint(t); } }
  function onPick(e){
    if (!picking) return;
    var t = target(e); if (!t) return;
    e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    if (e.type !== 'click') return; // mousedown только гасим (чтобы не тянулись ленты), выбор — по click
    ctx = describe(t);
    stopPick(); open();
  }
  function startPick(){
    picking = true; W.classList.add('picking'); pan.classList.remove('on'); W.classList.remove('open');
    hoverEl = null; hl.style.width = '0px';
  }
  function stopPick(){ picking = false; W.classList.remove('picking'); }
  // касание пальцем не гасим — иначе в режиме выбора нельзя пролистать страницу до нужного блока
  ['mousedown', 'click'].forEach(function(t){ window.addEventListener(t, onPick, true); });
  window.addEventListener('mousemove', onMove, true);
  window.addEventListener('pointermove', onMove, true);

  /* ── события панели ────────────────────────────────────────────────── */
  fab.addEventListener('click', function(){ pan.classList.contains('on') ? close() : open(); });
  q('.scrim').addEventListener('click', close);
  ta.addEventListener('keydown', function(e){ if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); add(); } });
  root.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-del')) { var a = load(); a.splice(+b.getAttribute('data-del'), 1); save(a); render(); return; }
    var act = b.getAttribute('data-a');
    if (act === 'close') close();
    else if (act === 'pick') startPick();
    else if (act === 'unpick') { stopPick(); open(); }
    else if (act === 'add') add();
    else if (act === 'copy') {
      var a = flush(); if (!a.length) return;
      copy(text(a)).then(function(done){
        ok.textContent = done ? 'Скопировано: ' + a.length + ' шт. Вставьте в чат Telegram.' : 'Не получилось скопировать — нажмите «Отправить…» или выделите текст вручную.';
      });
    }
    else if (act === 'share') {
      var a2 = flush(); if (!a2.length) return;
      navigator.share({ text: text(a2) }).catch(function(){});
    }
    else if (act === 'clear') {
      // второе нажатие подтверждает — случайное касание не сотрёт замечания
      if (b.getAttribute('data-sure') !== '1') { b.setAttribute('data-sure', '1'); b.textContent = 'Точно удалить все?'; setTimeout(function(){ b.removeAttribute('data-sure'); b.textContent = 'Очистить'; }, 4000); return; }
      b.removeAttribute('data-sure'); b.textContent = 'Очистить';
      save([]); render(); ok.textContent = 'Список очищен.';
    }
  });
  window.addEventListener('keydown', function(e){
    if (e.key !== 'Escape') return;
    if (picking) { stopPick(); open(); } else if (pan.classList.contains('on')) close();
  });

  /* ── не закрывать собой нижние панели сайта («Образец · Счёт», cookie) ── */
  function lift(){
    if (W.classList.contains('open')) return;
    var vw = window.innerWidth, vh = window.innerHeight, need = 0;
    host.style.pointerEvents = 'none'; host.style.visibility = 'hidden';
    [[vw - 40, vh - 20], [vw - 40, vh - 50], [vw - 12, vh - 8]].forEach(function(p){
      var els = document.elementsFromPoint ? document.elementsFromPoint(p[0], p[1]) : [];
      for (var k = 0; k < els.length; k++) {
        var el = els[k];
        if (el === host || el === document.body || el === document.documentElement) continue;
        for (var n = el; n && n !== document.body; n = n.parentElement) {
          var pos = getComputedStyle(n).position;
          if (pos === 'fixed' || pos === 'sticky') {
            var r = n.getBoundingClientRect();
            if (r.height < vh * 0.5 && r.bottom >= vh - 2) need = Math.max(need, vh - r.top);
            break;
          }
        }
      }
    });
    host.style.visibility = ''; host.style.pointerEvents = '';
    W.style.setProperty('--lift', need ? Math.ceil(need) + 'px' : '0px');
  }
  var raf = 0;
  function schedule(){ if (!raf) raf = requestAnimationFrame(function(){ raf = 0; lift(); }); }
  window.addEventListener('scroll', schedule, {passive: true});
  window.addEventListener('resize', schedule);
  setInterval(lift, 1200);

  render(); lift();
})();
