/* tkany.com — каталог: фильтры, карточки, подборка образцов, карточка артикула.
   Фасетные фильтры перенесены с 21st.dev «Ecommerce Category Page» (React) на чистый JS:
   счётчик у варианта считается с учётом остальных фильтров, нулевые гаснут, активные — чипами. */
(function(){
  'use strict';
  var ICE = window.ICE || {}, $ = ICE.$, $$ = ICE.$$;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function rub(x){ return Math.round(x).toLocaleString('ru-RU').replace(/ /g, ' '); }

  /* ── подборка образцов (как «избранное»: localStorage, без цен и оплаты) ── */
  var KEY = 'tk-samples', MAX = 30;
  var S = {
    all: function(){ try{ return JSON.parse(localStorage.getItem(KEY) || '[]'); }catch(e){ return []; } },
    save: function(a){ try{ localStorage.setItem(KEY, JSON.stringify(a)); }catch(e){} document.dispatchEvent(new CustomEvent('samples:change')); },
    has: function(sku){ return S.all().some(function(x){ return x.sku === sku; }); },
    add: function(it){ var a = S.all(); if(a.some(function(x){ return x.sku === it.sku; })) return; if(a.length >= MAX){ ICE.toast('В подборке уже ' + MAX + ' образцов — отправьте эту и соберите следующую'); return; } a.push(it); S.save(a); },
    remove: function(sku){ S.save(S.all().filter(function(x){ return x.sku !== sku; })); },
    toggle: function(it){ if(S.has(it.sku)){ S.remove(it.sku); return false; } S.add(it); return true; }
  };
  ICE.samples = S;
  function itemFrom(el){ return {sku: el.getAttribute('data-sku'), art: el.getAttribute('data-art'), color: el.getAttribute('data-color'), img: el.getAttribute('data-img'), url: el.getAttribute('data-url')}; }
  function syncButtons(){
    var a = S.all(), set = {}; a.forEach(function(x){ set[x.sku] = 1; });
    $$('[data-samples-count]').forEach(function(c){ c.textContent = a.length || ''; c.setAttribute('data-n', a.length); });
    $$('[data-sample-btn]').forEach(function(b){
      var on = !!set[b.getAttribute('data-sku')]; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
      var t = b.querySelector('[data-t]'); if(t) t.textContent = on ? (b.getAttribute('data-on') || 'В подборке ✓') : (b.getAttribute('data-off') || 'Получить образец');
    });
    renderSheet();
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest('[data-sample-btn]'); if(!b) return;
    e.preventDefault(); e.stopPropagation();
    var on = S.toggle(itemFrom(b));
    if(on) ICE.toast('Образец добавлен: ' + b.getAttribute('data-art') + ' — ' + b.getAttribute('data-color'), 'Открыть подборку', function(){ ICE.openSheet('samples'); });
  });
  document.addEventListener('samples:change', syncButtons);
  addEventListener('storage', function(e){ if(e.key === KEY) syncButtons(); });

  function renderSheet(){
    var s = document.getElementById('samples'); if(!s) return;
    var a = S.all(), list = $('[data-samples-list]', s), empty = $('[data-samples-empty]', s), form = $('form', s), n = $('[data-samples-n]', s);
    if(n) n.textContent = a.length ? '(' + a.length + ')' : '';
    empty.hidden = !!a.length; list.hidden = !a.length; if(form && !form.classList.contains('is-sent')) form.hidden = !a.length;
    list.innerHTML = a.map(function(x){
      return '<li><a href="' + esc(x.url) + '"><img src="' + esc(x.img) + '" alt=""></a><div><div class="n">' + esc(x.art) + '</div><div class="m">' + esc(x.color) + ' · ' + esc(x.sku) + '</div></div><button type="button" data-rm="' + esc(x.sku) + '">Убрать</button></li>';
    }).join('');
  }
  document.addEventListener('click', function(e){ var r = e.target.closest('[data-rm]'); if(r){ S.remove(r.getAttribute('data-rm')); } });
  function samplesForm(){
    var s = document.getElementById('samples'); if(!s) return;
    var f = $('form', s);
    f._extra = function(){ return ['Образцы (' + S.all().length + '):'].concat(S.all().map(function(x, i){ return (i + 1) + '. ' + x.art + ' — ' + x.color + ' (' + x.sku + ')'; })); };
    f.addEventListener('ice:sent', function(){ if(!document.documentElement.hasAttribute('data-draft')) S.save([]); });
  }

  /* ── каталог (PLP) ─────────────────────────────────────────────────────── */
  function plp(){
    var root = $('[data-plp]'); if(!root) return;
    var data = JSON.parse($('#plp-data').textContent), arts = data.arts, byId = {};
    arts.forEach(function(a, i){ a.i = i; byId[a.id] = a; });
    var grid = $('[data-grid]', root), cgrid = $('[data-cgrid]', root), cards = {};
    $$('.pcard', grid).forEach(function(c){ cards[c.getAttribute('data-id')] = c; });
    var DENS = [['0-100','до 100 г/м²'],['100-150','100–150'],['150-200','150–200'],['200-250','200–250'],['250-9999','больше 250']];
    function dbucket(d){ if(!d) return null; for(var i = 0; i < DENS.length; i++){ var r = DENS[i][0].split('-'); if(d >= +r[0] && d < +r[1]) return DENS[i][0]; } return null; }
    var FAC = data.facets; /* [{k,label,type,opts:[[value,label,hex?]]}] */
    var get = {
      s: function(a){ return [a.s]; }, f: function(a){ return [a.f]; }, t: function(a){ return a.t; },
      col: function(a){ var o = {}; a.cols.forEach(function(c){ c[2].split('|').forEach(function(x){ o[x] = 1; }); }); return Object.keys(o); },
      comp: function(a){ return [a.cg]; }, d: function(a){ return [dbucket(a.d)]; }, w: function(a){ return [a.w ? String(a.w) : null]; },
      b: function(a){ return [a.b]; }, c: function(a){ return [a.c]; }, pr: function(a){ return [a.pb]; }
    };
    var state = {sort: 'pop', view: 'arts', inStock: false, sel: {}};
    FAC.forEach(function(f){ state.sel[f.k] = []; });
    /* из адресной строки */
    var q = new URLSearchParams(location.search);
    FAC.forEach(function(f){ var v = q.get(f.k); if(v) state.sel[f.k] = v.split(','); });
    /* старые адреса живого сайта (WordPress): ?filter_usage=a;b, filter_composition, filter_color, filter_brand, filter_offers.
       Значение сопоставляется с вариантом фильтра по ключу или по названию («полиамид-эластан» = «Полиамид + эластан») */
    var OLD = {usage: 't', composition: 'comp', color: 'col', brand: 'b', offers: 'f'};
    function slug(x){ return String(x).toLowerCase().replace(/ё/g, 'е').replace(/полиэестер/g, 'полиэстер').replace(/распродажа/g, 'sale').replace(/&/g, '').replace(/[^a-z0-9а-я]+/g, '-').replace(/^-|-$/g, ''); }
    Object.keys(OLD).forEach(function(o){
      var v = q.get('filter_' + o), k = OLD[o], f = FAC.filter(function(x){ return x.k === k; })[0]; if(!v || !f) return;
      var got = []; v.split(/[;,]/).forEach(function(x){ var m = f.opts.filter(function(op){ return slug(op[0]) === slug(x) || slug(op[1]) === slug(x); })[0]; if(m) got.push(m[0]); });
      if(got.length) state.sel[k] = got;
    });
    if(q.get('in') === '1') state.inStock = true;
    if(q.get('sort')) state.sort = q.get('sort');
    if(q.get('view') === 'colors') state.view = 'colors';

    function match(a, skip){
      if(state.inStock && !a.in) return false;
      for(var i = 0; i < FAC.length; i++){
        var f = FAC[i], sel = state.sel[f.k]; if(f.k === skip || !sel.length) continue;
        var vals = get[f.k](a); if(!vals.some(function(v){ return sel.indexOf(v) >= 0; })) return false;
      }
      return true;
    }
    function sortList(list){
      var s = state.sort;
      return list.sort(function(x, y){
        if(s === 'price-asc') return (x.p || 1e9) - (y.p || 1e9);
        if(s === 'price-desc') return (y.p || 0) - (x.p || 0);
        if(s === 'dens') return (x.d || 1e9) - (y.d || 1e9);
        if(s === 'name') return x.n.localeCompare(y.n, 'ru');
        return x.o - y.o;
      });
    }
    /* панель фильтров */
    var side = $('[data-filters]', root);
    side.addEventListener('change', function(e){
      var el = e.target;
      if(el.name === 'in'){ state.inStock = el.checked; }
      else if(el.getAttribute('data-k')){
        var k = el.getAttribute('data-k'), v = el.value, sel = state.sel[k];
        if(el.checked){ if(sel.indexOf(v) < 0) sel.push(v); } else state.sel[k] = sel.filter(function(x){ return x !== v; });
      }
      apply(true);
    });
    $('[data-sort]', root).addEventListener('change', function(e){ state.sort = e.target.value; apply(); });
    $$('[data-view]', root).forEach(function(b){ b.addEventListener('click', function(){ state.view = b.getAttribute('data-view'); apply(); }); });
    var activeBox = $('[data-active]', root);
    activeBox.addEventListener('click', function(e){
      var b = e.target.closest('button'); if(!b) return;
      if(b.hasAttribute('data-clear')){ FAC.forEach(function(f){ state.sel[f.k] = []; }); state.inStock = false; }
      else if(b.getAttribute('data-k') === 'in') state.inStock = false;
      else { var k = b.getAttribute('data-k'), v = b.getAttribute('data-v'); state.sel[k] = state.sel[k].filter(function(x){ return x !== v; }); }
      apply(true);
    });
    $$('[data-filters-open]', root).forEach(function(b){ b.addEventListener('click', function(){ root.classList.add('is-filters'); ICE.lock(true); }); });
    $$('[data-filters-close]', root).forEach(function(b){ b.addEventListener('click', function(){ root.classList.remove('is-filters'); ICE.lock(false); }); });
    /* быстрые плашки над сеткой (назначение, тип полотна): нажатие добавляет/снимает значение, «Все» сбрасывает строку */
    $$('[data-quick]', root).forEach(function(b){ b.addEventListener('click', function(e){
      e.preventDefault(); var k = b.getAttribute('data-quick'), v = b.getAttribute('data-v'), sel = state.sel[k];
      if(v === '*') state.sel[k] = []; else state.sel[k] = sel.indexOf(v) >= 0 ? sel.filter(function(x){ return x !== v; }) : sel.concat([v]);
      apply(true);
    }); });

    var shownColors = 48;
    function apply(scrollTop){
      var list = arts.filter(function(a){ return match(a); });
      sortList(list);
      /* счётчики */
      FAC.forEach(function(f){
        var base = arts.filter(function(a){ return match(a, f.k); });
        $$('[data-k="' + f.k + '"]', side).forEach(function(inp){
          var v = inp.value, n = base.filter(function(a){ return get[f.k](a).indexOf(v) >= 0; }).length;
          var on = state.sel[f.k].indexOf(v) >= 0; inp.checked = on;
          var lab = inp.closest('label'); lab.classList.toggle('is-zero', !n && !on);
          var c = lab.querySelector('.n'); if(c) c.textContent = n;
        });
      });
      var tin = $('input[name=in]', side); if(tin) tin.checked = state.inStock;
      $$('[data-quick]', root).forEach(function(b){ var k = b.getAttribute('data-quick'), v = b.getAttribute('data-v'); b.classList.toggle('is-on', v === '*' ? !state.sel[k].length : state.sel[k].indexOf(v) >= 0); });
      /* активные фильтры чипами */
      var chips = [];
      FAC.forEach(function(f){ state.sel[f.k].forEach(function(v){ var o = f.opts.filter(function(x){ return x[0] === v; })[0]; chips.push('<button type="button" class="chip chip--x" data-k="' + f.k + '" data-v="' + esc(v) + '">' + esc(o ? o[1] : v) + '</button>'); }); });
      if(state.inStock) chips.push('<button type="button" class="chip chip--x" data-k="in">В наличии</button>');
      /* на телефоне фильтры спрятаны в панель — на кнопке видно, сколько их включено */
      $$('[data-filters-open]', root).forEach(function(b){ b.textContent = 'Фильтры' + (chips.length ? ' · ' + chips.length : ''); });
      if(chips.length) chips.push('<button type="button" class="chip" data-clear>Сбросить всё</button>');
      activeBox.innerHTML = chips.join('');
      /* сетка */
      var colorSel = state.sel.col;
      var nColors = 0; list.forEach(function(a){ a.cols.forEach(function(c){ if((!colorSel.length || colorSel.some(function(x){ return c[2].split('|').indexOf(x) >= 0; })) && (!state.inStock || c[7])) nColors++; }); });
      $('[data-count]', root).textContent = state.view === 'colors' ? nColors + ' ' + plural(nColors, 'цвет', 'цвета', 'цветов') : list.length + ' ' + plural(list.length, 'артикул', 'артикула', 'артикулов') + ' · ' + nColors + ' ' + plural(nColors, 'цвет', 'цвета', 'цветов');
      $$('[data-view]', root).forEach(function(b){ b.classList.toggle('is-on', b.getAttribute('data-view') === state.view); });
      if(state.view === 'arts'){
        cgrid.hidden = true; grid.hidden = false; $('[data-more]', root).hidden = true;
        var ids = {}; list.forEach(function(a){ ids[a.id] = 1; });
        Object.keys(cards).forEach(function(id){ cards[id].hidden = !ids[id]; });
        list.forEach(function(a, i){ var c = cards[a.id]; grid.appendChild(c); c.classList.remove('stagger'); if(i < 16){ c.style.setProperty('--i', i); void c.offsetWidth; c.classList.add('stagger'); } });
        tint(list, colorSel);
      } else {
        grid.hidden = true; cgrid.hidden = false;
        var tiles = [];
        list.forEach(function(a){ a.cols.forEach(function(c){
          if(colorSel.length && !colorSel.some(function(x){ return c[2].split('|').indexOf(x) >= 0; })) return;
          if(state.inStock && !c[7]) return;
          tiles.push([a, c]);
        }); });
        renderColors(tiles);
      }
      $('[data-empty]', root).classList.toggle('is-on', !list.length);
      /* адрес */
      var p = new URLSearchParams();
      FAC.forEach(function(f){ if(state.sel[f.k].length) p.set(f.k, state.sel[f.k].join(',')); });
      if(state.inStock) p.set('in', '1'); if(state.sort !== 'pop') p.set('sort', state.sort); if(state.view === 'colors') p.set('view', 'colors');
      var qs = p.toString(); history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
      if(scrollTop && root.getBoundingClientRect().top < 0) root.scrollIntoView({behavior:'auto'});
    }
    /* фильтр «Цвет»: карточка показывает первый подходящий цвет (как у Patagonia) */
    function tint(list, colorSel){
      list.forEach(function(a){
        var card = cards[a.id], img = card && card.querySelector('.pcard__media img:not(.alt)'), q = card && card.querySelector('[data-sample-btn]');
        if(!img) return;
        if(!img.hasAttribute('data-def')) img.setAttribute('data-def', img.getAttribute('src'));
        if(q && !q.hasAttribute('data-def-sku')) ['sku','color','img','url'].forEach(function(k){ q.setAttribute('data-def-' + k, q.getAttribute('data-' + k)); });
        var c = colorSel.length ? a.cols.filter(function(x){ return (!state.inStock || x[7]) && colorSel.some(function(f){ return x[2].split('|').indexOf(f) >= 0; }); })[0] : null;
        img.src = c ? c[3] : img.getAttribute('data-def');
        if(q) ['sku','color','img','url'].forEach(function(k, j){ q.setAttribute('data-' + k, c ? [c[0], c[1], c[4], c[5]][j] : q.getAttribute('data-def-' + k)); });
        $$('.sw', card).forEach(function(sw, k){ sw.classList.toggle('is-sel', c ? sw.getAttribute('data-sku') === c[0] : k === 0); });
      });
      syncButtons();
    }
    var lastTiles = [];
    function renderColors(tiles){
      lastTiles = tiles; shownColors = 48;
      cgrid.innerHTML = tiles.slice(0, shownColors).map(colorTile).join('');
      var more = $('[data-more]', root); more.hidden = tiles.length <= shownColors;
      syncButtons();
    }
    $('[data-more] button', root).addEventListener('click', function(){
      var from = shownColors; shownColors += 48;
      cgrid.insertAdjacentHTML('beforeend', lastTiles.slice(from, shownColors).map(colorTile).join(''));
      $('[data-more]', root).hidden = lastTiles.length <= shownColors; syncButtons();
    });
    function colorTile(x){
      var a = x[0], c = x[1];
      return '<article class="pcard ccard"><a class="pcard__media" href="' + c[5] + '"><img src="' + c[3] + '" alt="' + esc(a.n + ', ' + c[1]) + '" loading="lazy">' +
        '<span class="pcard__badges">' + (c[7] ? '' : '<span class="badge badge--g">Под заказ</span>') + '</span></a>' +
        '<div class="pcard__body"><h3 class="pcard__name"><a href="' + c[5] + '">' + esc(c[1]) + '</a></h3><p class="pcard__meta">' + esc(a.n) + ' · ' + esc(c[0]) + '</p>' +
        '<p class="pcard__price">' + (c[6] ? rub(c[6]) + ' ₽ <small>/ ' + esc(a.un) + '</small>' : '<small>Цена по запросу</small>') + '</p></div>' +
        '<button type="button" class="pcard__quick" data-sample-btn data-sku="' + esc(c[0]) + '" data-art="' + esc(a.n) + '" data-color="' + esc(c[1]) + '" data-img="' + c[4] + '" data-url="' + c[5] + '"><span data-t>Получить образец</span></button></article>';
    }
    function plural(n, a, b, c){ var m = n % 100, k = n % 10; if(m > 10 && m < 20) return c; if(k === 1) return a; if(k > 1 && k < 5) return b; return c; }
    $('[data-sort]', root).value = state.sort;
    apply();
  }

  /* ── карточка в сетке: наведение на чип цвета меняет фото ──────────────── */
  function cardSwatches(){
    document.addEventListener('pointerover', function(e){
      var sw = e.target.closest('.pcard .sw'); if(!sw || !fine) return;
      var card = sw.closest('.pcard'), img = card.querySelector('.pcard__media img:not(.alt)'), q = card.querySelector('[data-sample-btn]');
      if(sw.getAttribute('data-img') && img.getAttribute('src') !== sw.getAttribute('data-img')) img.src = sw.getAttribute('data-img');
      $$('.sw', card).forEach(function(s){ s.classList.toggle('is-sel', s === sw); });
      if(q){ ['sku','color','img','url'].forEach(function(k){ q.setAttribute('data-' + k, sw.getAttribute('data-' + k)); }); syncButtons(); }
    });
  }

  /* ── карточка артикула (PDP) ───────────────────────────────────────────── */
  function pdp(){
    var root = $('[data-pdp]'); if(!root) return;
    var d = JSON.parse($('#pdp-data').textContent), cols = d.cols, cur = d.sel || 0;
    var main = $('.pdp__main', root), mimg = $('img', main);
    var bSample = $$('[data-pdp-sample]'), bInv = $$('[data-pdp-invoice]');
    function sel(i, push){
      cur = i; var c = cols[i];
      var nimg = new Image(); nimg.src = c.big; nimg.onload = function(){ mimg.src = c.big; };
      mimg.alt = d.n + ', цвет ' + c.name;
      $$('[data-c-name]', root).forEach(function(e){ e.textContent = c.name; });
      $$('[data-c-sku]', root).forEach(function(e){ e.textContent = c.sku; });
      $$('[data-c-sup]', root).forEach(function(e){ e.textContent = c.sup ? '«' + c.sup + '»' : ''; });
      $$('[data-c-price]').forEach(function(e){ e.innerHTML = c.price ? rub(c.price) + ' ₽ <small>/ ' + esc(d.un) + '</small>' : '<small>Цена по запросу</small>'; });
      $$('[data-c-stock]', root).forEach(function(e){ e.textContent = c.in ? 'В наличии на складе в СПб' : 'Под заказ'; e.classList.toggle('is-out', !c.in); });
      $$('.pdp__sws .sw', root).forEach(function(s, k){ s.classList.toggle('is-sel', k === i); s.setAttribute('aria-checked', k === i ? 'true' : 'false'); });
      bSample.forEach(function(b){ b.setAttribute('data-sku', c.sku); b.setAttribute('data-color', c.name); b.setAttribute('data-img', c.sw); b.setAttribute('data-url', c.url); });
      bInv.forEach(function(b){ b.setAttribute('data-subject', d.n + ' (арт. ' + d.code + ') — ' + c.name + ', ' + c.sku); });
      syncButtons();
      if(push && c.url && c.url !== location.pathname) history.replaceState(null, '', c.url);
    }
    $$('.pdp__sws .sw', root).forEach(function(s, k){
      s.addEventListener('click', function(e){ e.preventDefault(); sel(k, true); });
      if(fine) s.addEventListener('pointerenter', function(){ mimg.src = cols[k].big; });
    });
    $('.pdp__sws', root).addEventListener('pointerleave', function(){ mimg.src = cols[cur].big; });
    $$('[data-thumb]', root).forEach(function(t){ t.addEventListener('click', function(e){ e.preventDefault(); sel(+t.getAttribute('data-thumb'), true); main.scrollIntoView({behavior:'smooth', block:'nearest'}); }); });
    /* лупа */
    main.addEventListener('click', function(){ main.classList.toggle('is-zoom'); });
    main.addEventListener('pointermove', function(e){ if(!main.classList.contains('is-zoom')) return; var r = main.getBoundingClientRect(); mimg.style.transformOrigin = ((e.clientX - r.left) / r.width * 100) + '% ' + ((e.clientY - r.top) / r.height * 100) + '%'; });
    main.addEventListener('pointerleave', function(){ main.classList.remove('is-zoom'); });
    /* липкая панель на телефоне, когда кнопки ушли из кадра */
    var acts = $('.pdp__actions', root), mb = $('.mbar-buy');
    if(acts && mb && 'IntersectionObserver' in window){
      new IntersectionObserver(function(es){ es.forEach(function(e){ mb.classList.toggle('is-on', !e.isIntersecting && e.boundingClientRect.top < 0); }); }).observe(acts);
    }
    sel(cur, false);
  }

  function init(){ samplesForm(); cardSwatches(); plp(); pdp(); syncButtons(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
