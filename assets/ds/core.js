/* Iceberg DS — общие скрипты обоих сайтов. Чистый JS, без зависимостей.
   Источники приёмов: меню и рельсы — Patagonia; прелоадер, нумерованные списки, липкие темы — Lumena;
   «мазут» — amberra (движок Paper Shaders); видеоплеер — 21st.dev Skiper67, переписан без React. */
(function(){
  'use strict';
  var $ = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var html = document.documentElement;
  var ICE = window.ICE = window.ICE || {};
  ICE.$ = $; ICE.$$ = $$;
  ICE.lock = function(on){ html.style.overflow = on ? 'hidden' : ''; };

  /* ── аналитика ───────────────────────────────────────────────────────────
     Одна точка для всех событий: пишем и в dataLayer (перфоманс-команде, если
     поставят GTM), и целью в Метрику. В черновике счётчика нет — тогда молчим.
     ⚠️ Имя события = идентификатор цели в Метрике, менять только вместе с ней. */
  ICE.ymId = function(){ return +html.getAttribute('data-ym') || 0; };
  /* Раздел сайта для раздельных целей по посадочным. Всё, куда не льём трафик, — 'site':
     событие обязано совпадать с заведённой целью, иначе уходит в пустоту. */
  ICE.section = function(){
    var p = location.pathname;
    if(p.indexOf('/shveinoe-proizvodstvo') === 0) return 'factory';
    if(p.indexOf('/proizvodstvo-vmesto-kitaya') === 0) return 'china';
    if(p.indexOf('/sportivnaya-odezhda') === 0) return 'sport';
    if(p.indexOf('/izgotovlenie-kupalnikov') === 0) return 'pool';
    if(p.indexOf('/bifleks') === 0) return 'fabric';
    return 'site';
  };
  ICE.goal = function(name, params){
    var o = {event: name, section: ICE.section()};
    if(params) for(var k in params) o[k] = params[k];
    try{ (window.dataLayer = window.dataLayer || []).push(o); }catch(e){}
    try{ var id = ICE.ymId(); if(id) ym(id, 'reachGoal', name, o); }catch(e){}
  };
  /* ClientID Метрики — ключ, которым заявка связывается с визитом (нужен и для
     сквозной аналитики, и чтобы руками найти визит по заявке). Приходит асинхронно,
     поэтому забираем заранее и держим на время визита. */
  ICE.cid = function(){
    try{ return sessionStorage.getItem('ice-cid') || ''; }catch(e){ return ''; }
  };
  (function(){
    var id = +html.getAttribute('data-ym') || 0; if(!id) return;
    try{ ym(id, 'getClientID', function(cid){ try{ sessionStorage.setItem('ice-cid', String(cid)); }catch(e){} }); }catch(e){}
  })();

  /* ── прелоадер ─────────────────────────────────────────────────────────── */
  function loader(){
    var el = $('[data-loader]');
    if(!el || html.classList.contains('no-loader')){ if(el) el.remove(); start(); return; }
    try{ sessionStorage.setItem('ice-ld', '1'); }catch(e){}
    var num = $('[data-loader-num]', el), bar = $('[data-loader-bar]', el);
    var target = 0, shown = 0, t0 = performance.now(), done = false, parts = {};
    function part(name, w){ parts[name] = w; }
    function finish(name){ if(parts[name] != null){ target += parts[name]; delete parts[name]; } }
    part('fonts', 30); part('media', 45); part('base', 25);
    (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function(){ finish('fonts'); });
    var v = $('[data-hv] video');
    if(v){
      if(v.readyState >= 3) finish('media');
      else { v.addEventListener('canplay', function(){ finish('media'); }, {once:true}); v.addEventListener('error', function(){ finish('media'); }, {once:true}); }
    } else finish('media');
    if(document.readyState === 'complete') finish('base'); else addEventListener('load', function(){ finish('base'); }, {once:true});
    setTimeout(function(){ target = 100; }, 4200); /* предохранитель: не держим экран дольше 4 с */
    (function tick(now){
      var minT = Math.min(1, (now - t0) / 1300);           /* не быстрее 1,3 с — иначе мелькает */
      var goal = Math.min(target, 100 * minT + (target >= 100 ? 0 : 0));
      shown += (goal - shown) * 0.09;
      if(target >= 100 && minT >= 1 && shown > 99.4) shown = 100;
      var n = Math.round(shown);
      num.firstChild.nodeValue = String(n);
      bar.style.transform = 'scaleX(' + (shown / 100) + ')';
      if(n >= 100 && !done){
        done = true;
        setTimeout(function(){
          el.classList.add('is-done'); start();
          setTimeout(function(){ el.remove(); }, 1000);
        }, 180);
        return;
      }
      requestAnimationFrame(tick);
    })(t0);
  }
  var started = false;
  function start(){
    if(started) return; started = true;
    html.classList.add('is-ready');
    $$('[data-hero-lines]').forEach(function(el){ el.classList.add('is-in'); });
    document.dispatchEvent(new CustomEvent('ice:ready'));
  }

  /* ── шапка: прячется вниз по скроллу, мега-меню, мобильное меню ─────────── */
  function header(){
    var head = $('[data-head]'); if(!head) return;
    var lastY = scrollY, ticking = false;
    function onScroll(){
      var y = scrollY;
      head.classList.toggle('is-scrolled', y > 4);
      if(!head.classList.contains('is-open')){
        if(y > 260 && y > lastY + 6) head.classList.add('is-hidden');
        else if(y < lastY - 6 || y < 120) head.classList.remove('is-hidden');
      }
      lastY = y; ticking = false;
    }
    addEventListener('scroll', function(){ if(!ticking){ ticking = true; requestAnimationFrame(onScroll); } }, {passive:true});

    var veil = $('[data-veil]'), cur = null, tOpen = 0, tClose = 0;
    function open(id){
      clearTimeout(tClose);
      var panel = document.getElementById('mega-' + id); if(!panel) return;
      if(cur && cur !== panel){ cur.classList.remove('is-open'); }
      cur = panel; panel.classList.add('is-open'); head.classList.add('is-open');
      veil && veil.classList.add('is-on');
      $$('.nav__item', head).forEach(function(li){
        var on = li.getAttribute('data-mega') === id;
        li.classList.toggle('is-active', on);
        var a = $('.nav__link', li); if(a) a.setAttribute('aria-expanded', on ? 'true' : 'false');
      });
    }
    function close(now){
      clearTimeout(tOpen);
      var go = function(){
        if(cur) cur.classList.remove('is-open'); cur = null; head.classList.remove('is-open');
        veil && veil.classList.remove('is-on');
        $$('.nav__item', head).forEach(function(li){ li.classList.remove('is-active'); var a = $('.nav__link', li); if(a) a.setAttribute('aria-expanded','false'); });
      };
      clearTimeout(tClose);
      if(now) go(); else tClose = setTimeout(go, 220);
    }
    $$('.nav__item[data-mega]', head).forEach(function(li){
      var id = li.getAttribute('data-mega');
      li.addEventListener('pointerenter', function(e){
        if(e.pointerType !== 'mouse') return;
        clearTimeout(tOpen); clearTimeout(tClose);
        tOpen = setTimeout(function(){ open(id); }, cur ? 0 : 90);
      });
      li.addEventListener('focusin', function(){ open(id); });
    });
    $$('.nav__item:not([data-mega])', head).forEach(function(li){
      li.addEventListener('pointerenter', function(){ close(); });
    });
    head.addEventListener('pointerleave', function(e){ if(e.pointerType === 'mouse') close(); });
    head.addEventListener('pointerenter', function(){ clearTimeout(tClose); });
    $$('.mega', head).forEach(function(p){
      p.addEventListener('focusout', function(e){ if(!head.contains(e.relatedTarget)) close(true); });
    });
    veil && veil.addEventListener('click', function(){ close(true); });
    addEventListener('keydown', function(e){
      if(e.key === 'Escape' && cur){ var a = $('.nav__item.is-active .nav__link', head); close(true); a && a.focus(); }
    });

    /* мобильное меню; в режиме menu-side — боковая панель слева на всех ширинах */
    var dn = $('[data-drawer-nav]');
    if(dn){
      var stack = [], html = document.documentElement, dveil = $('[data-dveil]');
      var side = function(){ return html.classList.contains('menu-side'); };
      var wide = function(){ return side() && matchMedia('(min-width:1081px)').matches; };
      function mark(id){
        dn.classList.toggle('has-sub', !!id && id !== 'root' && wide());
        $$('[data-dgo]', dn).forEach(function(x){ x.classList.toggle('is-on', x.getAttribute('data-dgo') === id); });
      }
      function show(id, back){
        var next = $('[data-dpanel="' + id + '"]', dn), curP = $('.dpanel.is-cur', dn);
        if(!next || next === curP) return;
        if(wide()){
          /* компьютер: разделы стоят слева, подменю меняется справа */
          $$('.dpanel', dn).forEach(function(p){ if(p.getAttribute('data-dpanel') !== 'root') p.classList.remove('is-cur','is-prev'); });
          $('[data-dpanel="root"]', dn).classList.add('is-prev');
          next.classList.add('is-cur'); mark(id); return;
        }
        if(curP){ curP.classList.remove('is-cur'); if(!back){ curP.classList.add('is-prev'); stack.push(curP.getAttribute('data-dpanel')); } }
        $$('.dpanel.is-prev', dn).forEach(function(p){ if(back && p === next) p.classList.remove('is-prev'); });
        next.classList.remove('is-prev'); next.classList.add('is-cur'); mark(id);
        var f = $('a,button', next); f && f.focus({preventScroll:true});
      }
      function openD(b){
        close(true);
        if(side()){
          /* панель встаёт вровень со строкой шапки: сдвиг на высоту чёрной плашки */
          var ub = $('.ubar'), off = ub ? Math.max(0, ub.getBoundingClientRect().bottom) : 0;
          dn.style.setProperty('--dn-off', off + 'px');
        }
        dn.classList.add('is-open'); ICE.lock(true); b && b.setAttribute('aria-expanded','true');
        if(side() && dveil) dveil.classList.add('is-on');
        $$('.dpanel', dn).forEach(function(p){ p.classList.remove('is-cur','is-prev'); });
        stack = []; $('[data-dpanel="root"]', dn).classList.add('is-cur'); mark(null);
        $$('[data-dsub].is-on', dn).forEach(function(a){ subOn(a, false); });
        var c = $('.drawer-nav__top [data-drawer-close]', dn); c && c.focus({preventScroll:true});
      }
      function closeD(){
        if(!dn.classList.contains('is-open')) return;
        dn.classList.remove('is-open','has-sub'); ICE.lock(false);
        dveil && dveil.classList.remove('is-on');
        $$('[data-drawer-open]').forEach(function(o){ o.setAttribute('aria-expanded','false'); });
      }
      $$('[data-drawer-open]').forEach(function(b){ b.addEventListener('click', function(){ openD(b); }); });
      $$('[data-drawer-close]', dn).forEach(function(b){ b.addEventListener('click', closeD); });
      dveil && dveil.addEventListener('click', closeD);
      addEventListener('keydown', function(e){ if(e.key === 'Escape' && dn.classList.contains('is-open')) closeD(); });
      $$('[data-dgo]', dn).forEach(function(b){
        b.addEventListener('click', function(e){
          /* компьютер: подменю уже открыто наведением — нажатие ведёт на страницу раздела; телефон: открывает подменю */
          if(b.tagName === 'A' && wide() && b.classList.contains('is-on')) return;
          e.preventDefault(); show(b.getAttribute('data-dgo'));
        });
        /* на компьютере подменю открывается наведением, как у Patagonia */
        var t = 0;
        b.addEventListener('pointerenter', function(e){ if(e.pointerType !== 'mouse' || !wide()) return; clearTimeout(t); t = setTimeout(function(){ show(b.getAttribute('data-dgo')); }, 70); });
        b.addEventListener('pointerleave', function(){ clearTimeout(t); });
      });
      /* пункт с подпунктами («Спортивная одежда»): компьютер — колонка справа по наведению или первому нажатию,
         повторное нажатие ведёт на страницу раздела; телефон — своя панель с кнопкой «назад» */
      function subOn(a, on){
        var pane = a.closest('.dpanel'), id = a.getAttribute('data-dsub');
        $$('[data-dsub]', pane).forEach(function(x){ var me = on && x === a; x.classList.toggle('is-on', me); x.setAttribute('aria-expanded', me ? 'true' : 'false'); });
        $$('[data-dsubpanel]', pane).forEach(function(p){ p.classList.toggle('is-on', on && p.getAttribute('data-dsubpanel') === id); });
        pane.classList.toggle('has-sub2', !!on);
      }
      $$('[data-dsub]', dn).forEach(function(a){
        var t = 0;
        a.addEventListener('pointerenter', function(e){ if(e.pointerType !== 'mouse' || !wide()) return; clearTimeout(t); t = setTimeout(function(){ subOn(a, true); }, 70); });
        a.addEventListener('pointerleave', function(){ clearTimeout(t); });
        a.addEventListener('click', function(e){
          if(wide()){ if(!a.classList.contains('is-on')){ e.preventDefault(); subOn(a, true); } return; }
          e.preventDefault(); show('sub-' + a.getAttribute('data-dsub'));
        });
      });
      /* наведение на соседний пункт того же списка сворачивает подпункты */
      $$('.dcol:not(.dcol--sub) .dlink:not([data-dsub])', dn).forEach(function(x){
        x.addEventListener('pointerenter', function(e){ if(e.pointerType !== 'mouse' || !wide()) return; var a = $('[data-dsub].is-on', x.closest('.dpanel')); a && subOn(a, false); });
      });
      $$('[data-dback]', dn).forEach(function(b){ b.addEventListener('click', function(){
        var prev = stack.pop() || 'root';
        var curP = $('.dpanel.is-cur', dn); curP && curP.classList.remove('is-cur');
        var p = $('[data-dpanel="' + prev + '"]', dn); p.classList.remove('is-prev'); p.classList.add('is-cur'); mark(prev);
      }); });
    }
  }

  /* ── боковое меню (режим menu-side): кнопка «Меню» рядом с логотипом, панель слева ── */
  function sideMenu(){
    var d = $('[data-sdrawer]'); if(!d) return;
    var veil = $('[data-veil]'), last = null;
    function open(b){
      last = b || document.activeElement;
      d.classList.add('is-open'); d.setAttribute('aria-hidden','false'); ICE.lock(true);
      veil && veil.classList.add('is-on');
      $$('[data-sdrawer-open]').forEach(function(o){ o.setAttribute('aria-expanded','true'); });
      var c = $('.sdrawer__top [data-sdrawer-close]', d); c && c.focus({preventScroll:true});
    }
    function close(){
      if(!d.classList.contains('is-open')) return;
      d.classList.remove('is-open'); d.setAttribute('aria-hidden','true'); ICE.lock(false);
      veil && veil.classList.remove('is-on');
      $$('[data-sdrawer-open]').forEach(function(o){ o.setAttribute('aria-expanded','false'); });
      last && last.focus && last.focus({preventScroll:true});
    }
    $$('[data-sdrawer-open]').forEach(function(b){ b.addEventListener('click', function(){ open(b); }); });
    $$('[data-sdrawer-close]', d).forEach(function(b){ b.addEventListener('click', close); });
    $$('.sdrawer__body a', d).forEach(function(a){ a.addEventListener('click', close); });
    veil && veil.addEventListener('click', close);
    addEventListener('keydown', function(e){ if(e.key === 'Escape') close(); });
  }

  /* ── появление при скролле ─────────────────────────────────────────────── */
  function reveal(){
    var els = $$('[data-reveal],.lines:not([data-hero-lines])');
    if(!('IntersectionObserver' in window) || reduce){ els.forEach(function(e){ e.classList.add('is-in'); }); return; }
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } });
    }, {rootMargin:'0px 0px -8% 0px', threshold:.12});
    els.forEach(function(e){ io.observe(e); });
  }

  /* ── видео первого экрана + полноэкранный плеер ────────────────────────── */
  function heroVideo(){
    var modal = $('[data-vmodal]'); if(!modal) return;
    var hv = $('[data-hv]'), stage = $('.vmodal__stage', modal), mv = $('video', modal);
    /* без видео-героя (внутренние страницы) окно открывается от блока [data-v-frame] или кнопки [data-v-open] */
    var frame = hv ? $('.hv__frame', hv) : ($('[data-v-frame]') || $('[data-v-open]')), bg = frame ? $('video', frame) : null, label = hv ? $('.hv__cursor', frame) : null;
    /* ролик в рамке без звука: на первом экране стартует сразу, в блоке ниже — когда блок в кадре (наблюдатель внизу) */
    if(bg){ bg.muted = true; if(hv){ var p = bg.play(); if(p && p.catch) p.catch(function(){}); } }
    /* надпись «смотреть со звуком» едет за курсором с инерцией */
    if(label && fine){
      var tx = 0, ty = 0, x = 0, y = 0, raf = 0;
      frame.addEventListener('pointermove', function(e){
        var r = frame.getBoundingClientRect(); tx = e.clientX - r.left + 18; ty = e.clientY - r.top + 18;
        if(!raf) raf = requestAnimationFrame(loop);
      });
      frame.addEventListener('pointerenter', function(e){ var r = frame.getBoundingClientRect(); x = tx = e.clientX - r.left + 18; y = ty = e.clientY - r.top + 18; });
      function loop(){ x += (tx - x) * .2; y += (ty - y) * .2; label.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0)';
        raf = (Math.abs(tx - x) + Math.abs(ty - y) > .3) ? requestAnimationFrame(loop) : 0; }
    }
    function rectClip(){
      var r = frame.getBoundingClientRect(), W = innerWidth, H = innerHeight;
      return 'inset(' + Math.max(0, r.top) + 'px ' + Math.max(0, W - r.right) + 'px ' + Math.max(0, H - r.bottom) + 'px ' + Math.max(0, r.left) + 'px)';
    }
    var bar = $('.vrange i', modal), time = $('.vmodal__time', modal), pp = $('[data-v-pp]', modal), mute = $('[data-v-mute]', modal);
    function fmt(s){ s = Math.max(0, Math.floor(s || 0)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
    function upd(){ if(!mv.duration) return; bar.style.width = (mv.currentTime / mv.duration * 100) + '%'; time.textContent = fmt(mv.currentTime) + ' / ' + fmt(mv.duration); }
    function setPP(){ pp.innerHTML = mv.paused ? ICON.play + 'Играть' : ICON.pause + 'Пауза'; }
    function setMute(){ mute.innerHTML = mv.muted ? ICON.muted + 'Звук' : ICON.sound + 'Без звука'; }
    mv.addEventListener('timeupdate', upd); mv.addEventListener('play', setPP); mv.addEventListener('pause', setPP); mv.addEventListener('ended', setPP);
    pp.addEventListener('click', function(){ mv.paused ? mv.play() : mv.pause(); });
    mute.addEventListener('click', function(){ mv.muted = !mv.muted; setMute(); });
    var range = $('.vrange', modal);
    function seek(e){ var r = range.getBoundingClientRect(); var k = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); if(mv.duration){ mv.currentTime = k * mv.duration; upd(); } }
    range.addEventListener('pointerdown', function(e){ range.setPointerCapture(e.pointerId); seek(e); range.addEventListener('pointermove', seek); });
    range.addEventListener('pointerup', function(){ range.removeEventListener('pointermove', seek); });
    var lastFocus = null;
    var vSent = false;
    function openV(){
      /* фоновый ролик крутится сам, поэтому считаем только осознанный запуск —
         открытие полноэкранного плеера */
      if(!vSent){ vSent = true; ICE.goal('video_play', {page: location.pathname}); }
      lastFocus = document.activeElement;
      if(!mv.getAttribute('src')) mv.src = mv.getAttribute('data-src');
      stage.style.setProperty('--clip', reduce ? 'inset(0 0 0 0)' : rectClip());
      modal.classList.add('is-open'); ICE.lock(true);
      stage.getBoundingClientRect();
      requestAnimationFrame(function(){ stage.style.setProperty('--clip', 'inset(0 0 0 0)'); });
      mv.currentTime = 0; mv.muted = false; mv.volume = 1; setMute();
      var pr = mv.play(); if(pr && pr.catch) pr.catch(function(){ mv.muted = true; setMute(); mv.play(); });
      bg && bg.pause();
      $('.vmodal__close', modal).focus({preventScroll:true});
    }
    function closeV(){
      if(!modal.classList.contains('is-open')) return;
      stage.style.setProperty('--clip', reduce ? 'inset(50%)' : rectClip());
      mv.pause();
      setTimeout(function(){ modal.classList.remove('is-open'); ICE.lock(false); bg && bg.play().catch(function(){}); lastFocus && lastFocus.focus && lastFocus.focus({preventScroll:true}); }, reduce ? 0 : 650);
    }
    if(hv || frame.hasAttribute('data-v-frame')) frame.addEventListener('click', function(e){ if(e.target.closest('a,[data-v-open]')) return; openV(); });
    $$('[data-v-open]').forEach(function(b){ b.addEventListener('click', function(e){ e.stopPropagation(); openV(); }); });
    $('.vmodal__close', modal).addEventListener('click', closeV);
    $('.vmodal__veil', modal).addEventListener('click', closeV);
    addEventListener('keydown', function(e){
      if(!modal.classList.contains('is-open')) return;
      if(e.key === 'Escape') closeV();
      if(e.key === ' ' && document.activeElement && document.activeElement.tagName !== 'BUTTON'){ e.preventDefault(); mv.paused ? mv.play() : mv.pause(); }
    });
    /* видео не играет за кадром — экономим батарею */
    if('IntersectionObserver' in window && bg){
      new IntersectionObserver(function(es){ es.forEach(function(e){
        if(modal.classList.contains('is-open')) return;
        if(e.isIntersecting) bg.play().catch(function(){}); else bg.pause();
      }); }).observe(frame);
    }
  }
  var ICON = {
    play: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>',
    pause: '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/></svg>',
    sound: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M2.5 6h2.5l3.5-3v10L5 10H2.5z"/><path d="M11 5.5a3.5 3.5 0 010 5M12.8 3.6a6 6 0 010 8.8"/></svg>',
    muted: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M2.5 6h2.5l3.5-3v10L5 10H2.5z"/><path d="M11 6l4 4M15 6l-4 4"/></svg>'
  };
  ICE.ICON = ICON;

  /* ── рельсы ────────────────────────────────────────────────────────────── */
  function rails(){
    $$('[data-rail-wrap]').forEach(function(w){
      var r = $('[data-rail]', w), prev = $('[data-rail-prev]', w), next = $('[data-rail-next]', w);
      if(!r) return;
      function step(){ var c = r.children[0]; return c ? (c.getBoundingClientRect().width + parseFloat(getComputedStyle(r).columnGap || 16)) * Math.max(1, Math.floor(r.clientWidth / (c.getBoundingClientRect().width + 16)) - 0) : 300; }
      function upd(){ if(!prev) return; prev.disabled = r.scrollLeft < 4; next.disabled = r.scrollLeft + r.clientWidth > r.scrollWidth - 4; }
      prev && prev.addEventListener('click', function(){ r.scrollBy({left:-step(), behavior: reduce ? 'auto' : 'smooth'}); });
      next && next.addEventListener('click', function(){ r.scrollBy({left:step(), behavior: reduce ? 'auto' : 'smooth'}); });
      r.addEventListener('scroll', function(){ requestAnimationFrame(upd); }, {passive:true}); upd();
      /* перетаскивание мышью (на тачпаде и телефоне работает нативный скролл) */
      if(fine){
        var down = false, sx = 0, sl = 0, moved = 0;
        r.addEventListener('pointerdown', function(e){ if(e.pointerType !== 'mouse' || e.button) return; down = true; moved = 0; sx = e.clientX; sl = r.scrollLeft; r.style.scrollSnapType = 'none'; });
        addEventListener('pointermove', function(e){ if(!down) return; var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); r.scrollLeft = sl - dx; });
        addEventListener('pointerup', function(){ if(!down) return; down = false; r.style.scrollSnapType = ''; });
        r.addEventListener('click', function(e){ if(moved > 6){ e.preventDefault(); e.stopPropagation(); } }, true);
        r.addEventListener('dragstart', function(e){ e.preventDefault(); });
      }
    });
  }

  /* ── горизонтальная прокрутка ленты по вертикальному скроллу ([data-hscroll]) ── */
  function hscroll(){
    $$('[data-hscroll]').forEach(function(sec){
      var pin = $('.hs__pin', sec), rail = $('[data-rail]', sec); if(!pin || !rail) return;
      var mq = matchMedia('(min-width:901px) and (pointer:fine)'), max = 0;
      function layout(){
        if(!mq.matches || reduce){ sec.classList.remove('is-hs'); sec.style.height = ''; rail.scrollLeft = 0; return; }
        sec.classList.add('is-hs');
        max = Math.max(0, rail.scrollWidth - rail.clientWidth);
        sec.style.height = (innerHeight + max) + 'px';
        onScroll();
      }
      function onScroll(){
        if(!sec.classList.contains('is-hs')) return;
        var r = sec.getBoundingClientRect(), span = sec.offsetHeight - innerHeight;
        var p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
        rail.scrollLeft = p * max;
        sec.style.setProperty('--p', p.toFixed(4));
      }
      addEventListener('scroll', function(){ requestAnimationFrame(onScroll); }, {passive:true});
      addEventListener('resize', layout);
      (mq.addEventListener ? mq.addEventListener('change', layout) : mq.addListener(layout));
      addEventListener('load', layout);
      layout();
    });
  }

  /* ── аккордеоны ────────────────────────────────────────────────────────── */
  function accordions(){
    $$('[data-acc]').forEach(function(box){
      var single = box.getAttribute('data-acc') === 'single';
      $$('.acc__btn', box).forEach(function(btn){
        btn.addEventListener('click', function(){
          var it = btn.closest('.acc__item'), on = !it.classList.contains('is-open');
          if(single) $$('.acc__item.is-open', box).forEach(function(o){ if(o !== it){ o.classList.remove('is-open'); $('.acc__btn', o).setAttribute('aria-expanded','false'); } });
          it.classList.toggle('is-open', on); btn.setAttribute('aria-expanded', on ? 'true' : 'false');
        });
      });
    });
  }

  /* ── «Для кого»: активный пункт по скроллу ─────────────────────────────── */
  function themes(){
    $$('[data-themes]').forEach(function(box){
      var links = $$('.themes__list a', box), panels = $$('[data-theme]', box), meta = $$('[data-theme-meta]', box);
      function set(id){
        links.forEach(function(a){ a.classList.toggle('is-cur', a.getAttribute('href') === '#' + id); });
        meta.forEach(function(m){ m.hidden = m.getAttribute('data-theme-meta') !== id; });
      }
      var io = new IntersectionObserver(function(es){
        es.forEach(function(e){ if(e.isIntersecting) set(e.target.id); });
      }, {rootMargin:'-45% 0px -50% 0px'});
      panels.forEach(function(p){ io.observe(p); });
      if(panels[0]) set(panels[0].id);
    });
  }

  /* ── катер: секвенция кадров на canvas (логика прежней главной сохранена) ── */
  function yacht(){
    var sec = $('[data-yacht]'); if(!sec) return;
    var N = +sec.getAttribute('data-frames') || 81, base = sec.getAttribute('data-path');
    var track = $('.yacht__track', sec), canvas = $('canvas', sec), prog = $('.yacht__prog', sec);
    var ctx = canvas.getContext('2d', {alpha:false});
    var tint = sec.getAttribute('data-tint') || '#F4F1E8';
    var images = [], loaded = 0, target = 0, current = 0, raf = null, ready = false;
    /* ⚠️ Раньше кадр появлялся только после загрузки ВСЕХ 81 картинки, а fit() до
       этого не вызывался — на телефоне посетитель видел пустое место (canvas висел
       в размере по умолчанию 300×150). Теперь холст готов сразу, а рисуем с первого
       же загруженного кадра, подставляя ближайший готовый. */
    function load(){
      for(var i = 1; i <= N; i++){
        (function(idx){
          var img = new Image(); img.decoding = 'async';
          img.src = base + 'f_' + String(idx).padStart(3, '0') + '.webp';
          img.onload = function(){
            loaded++;
            if(!ready){ ready = true; fit(); onScroll(); }  /* на старте секция могла быть ещё без размеров */
            draw(current);
          };
          img.onerror = function(){ loaded++; };
          images[idx - 1] = img;
        })(i);
      }
    }
    fit();
    var near = new IntersectionObserver(function(es){ if(es[0].isIntersecting){ near.disconnect(); load(); } }, {rootMargin:'150% 0px'});
    near.observe(sec);
    new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting) sec.classList.add('is-in'); }); }, {threshold:.35}).observe($('.yacht__pin', sec));
    function fit(){
      var w = canvas.offsetWidth, h = canvas.offsetHeight;
      if(!w || !h) return;                       /* размеров ещё нет — пересчитаем позже */
      var dpr = Math.min(devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    }
    function draw(p){
      if(!ready) return;
      var want = Math.max(0, Math.min(N - 1, Math.round(p * (N - 1)))), img = images[want];
      if(!img || !img.naturalWidth){
        /* нужный кадр ещё в пути — показываем ближайший готовый, чтобы блок не пустовал */
        for(var d = 1; d < N; d++){
          var a = images[want - d], b = images[want + d];
          if(a && a.naturalWidth){ img = a; break; }
          if(b && b.naturalWidth){ img = b; break; }
        }
      }
      if(!img || !img.naturalWidth) return;
      var cw = canvas.width, ch = canvas.height, iw = img.naturalWidth, ih = img.naturalHeight;
      var cx = innerWidth > 900 ? 0.64 : 0.5;
      var s = Math.max(cw / iw, ch / ih, 2 * Math.max(cx, 1 - cx) * cw / iw) * 1.02;
      var w = iw * s, h = ih * s;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(img, cw * cx - w / 2, (ch - h) / 2, w, h);
      /* у кадров холодный серый фон — подкрашиваем в крем сайта, чехол остаётся индиго */
      ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = tint; ctx.fillRect(0, 0, cw, ch);
      ctx.globalCompositeOperation = 'source-over';
    }
    function onScroll(){
      var r = track.getBoundingClientRect(), total = track.offsetHeight - innerHeight;
      target = Math.min(1, Math.max(0, -r.top / total));
      if(prog) prog.style.setProperty('--p', target.toFixed(3));
      if(!raf) raf = requestAnimationFrame(tick);
    }
    function tick(){ current += (target - current) * 0.16; draw(current); raf = Math.abs(target - current) > 0.0008 ? requestAnimationFrame(tick) : null; }
    addEventListener('scroll', onScroll, {passive:true});
    addEventListener('resize', function(){ fit(); draw(current); onScroll(); });
  }

  /* ── «мазут»: закреплённая секция, шаги по скроллу + mesh-градиент Paper ── */
  function liquid(){
    $$('[data-liquid]').forEach(function(sec){
      var track = $('.liquid__track', sec), words = $$('.liquid__desk .liquid__word', sec), texts = $$('.liquid__desk .liquid__text', sec), steps = $$('.liquid__steps span', sec);
      var n = words.length, cur = -1;
      function onScroll(){
        if(innerWidth <= 900) return;
        var r = track.getBoundingClientRect(), total = track.offsetHeight - innerHeight;
        var p = Math.min(.9999, Math.max(0, -r.top / total)), i = Math.floor(p * n), local = p * n - i;
        steps.forEach(function(s, k){ s.style.setProperty('--w', (k < i ? 100 : k === i ? local * 100 : 0) + '%'); s.classList.toggle('is-cur', k === i); });
        if(i === cur) return; cur = i;
        words.forEach(function(w, k){ w.classList.toggle('is-cur', k === i); w.classList.toggle('is-past', k < i); });
        texts.forEach(function(t, k){ t.classList.toggle('is-cur', k === i); });
      }
      addEventListener('scroll', function(){ requestAnimationFrame(onScroll); }, {passive:true}); onScroll();
      var fx = $('.liquid__fx', sec), PS = window.PaperShaders;
      if(!fx || !PS) return;
      var io = new IntersectionObserver(function(es){
        if(!es[0].isIntersecting) return; io.disconnect();
        try{
          var sz = PS.defaultObjectSizing, cols = (fx.getAttribute('data-colors') || '').split(',');
          new PS.ShaderMount(fx, PS.meshGradientFragmentShader, {
            u_colors: cols.map(PS.getShaderColorFromString), u_colorsCount: cols.length,
            u_distortion: +fx.getAttribute('data-distortion') || .85, u_swirl: +fx.getAttribute('data-swirl') || .3,
            u_grainMixer: 0, u_grainOverlay: 0, u_fit: PS.ShaderFitOptions[sz.fit], u_rotation: sz.rotation, u_scale: sz.scale,
            u_offsetX: sz.offsetX, u_offsetY: sz.offsetY, u_originX: sz.originX, u_originY: sz.originY,
            u_worldWidth: sz.worldWidth, u_worldHeight: sz.worldHeight
          }, {alpha:false, antialias:false}, reduce ? 0 : (+fx.getAttribute('data-speed') || .22), 1800, 1, 1600 * 900);
          fx.classList.add('is-on');
        }catch(e){}
      }, {rootMargin:'60% 0px'});
      io.observe(sec);
    });
  }

  /* ── выезжающие панели и модальные окна ────────────────────────────────── */
  var openSheet = null, sheetFocus = null;
  ICE.openSheet = function(id, prep){
    var s = document.getElementById(id); if(!s) return;
    if(openSheet) ICE.closeSheet(true);
    sheetFocus = document.activeElement; if(prep) prep(s);
    s.classList.add('is-open'); s.setAttribute('aria-hidden','false'); ICE.lock(true); openSheet = s;
    var f = $('[autofocus], .sheet__body input:not([type=hidden]):not(.hp), .sheet__head button', s); setTimeout(function(){ f && f.focus({preventScroll:true}); }, 60);
  };
  ICE.closeSheet = function(quiet){
    if(!openSheet) return; openSheet.classList.remove('is-open'); openSheet.setAttribute('aria-hidden','true'); openSheet = null;
    ICE.lock(false); if(!quiet && sheetFocus && sheetFocus.focus) sheetFocus.focus({preventScroll:true});
  };
  function sheets(){
    document.addEventListener('click', function(e){
      var o = e.target.closest('[data-sheet-open]');
      if(o){ e.preventDefault(); var id = o.getAttribute('data-sheet-open'); ICE.openSheet(id, function(s){ var subj = o.getAttribute('data-subject'); var f = $('[name=subject]', s); if(f && subj) f.value = subj; var t = $('[data-subject-view]', s); if(t) t.textContent = subj || t.getAttribute('data-default') || ''; }); return; }
      if(e.target.closest('[data-sheet-close]') || e.target.classList.contains('sheet__veil')) ICE.closeSheet();
    });
    addEventListener('keydown', function(e){ if(e.key === 'Escape' && openSheet) ICE.closeSheet(); });
  }

  /* ── тост ──────────────────────────────────────────────────────────────── */
  var toastT = 0;
  ICE.toast = function(text, actLabel, act){
    var t = $('[data-toast]'); if(!t){ t = document.createElement('div'); t.className = 'toast'; t.setAttribute('data-toast',''); t.setAttribute('role','status'); document.body.appendChild(t); }
    t.innerHTML = '<span></span>'; t.firstChild.textContent = text;
    if(actLabel){ var b = document.createElement('button'); b.type = 'button'; b.textContent = actLabel; b.addEventListener('click', function(){ t.classList.remove('is-on'); act && act(); }); t.appendChild(b); }
    t.classList.add('is-on'); clearTimeout(toastT); toastT = setTimeout(function(){ t.classList.remove('is-on'); }, 4200);
  };

  /* ── формы: черновик показывает, что получит менеджер ──────────────────── */
  ICE.packMessage = function(form, extra){
    var lines = [], skip = {name:1, phone:1, consent:1, website:1, form:1};
    $$('input,select,textarea', form).forEach(function(el){
      if(!el.name || skip[el.name] || el.type === 'hidden' && el.name !== 'subject' && !el.hasAttribute('data-label')) return;
      if((el.type === 'checkbox' || el.type === 'radio') && !el.checked) return;
      var v = (el.value || '').trim(); if(!v) return;
      var lab = el.getAttribute('data-label') || el.name; lines.push(lab + ': ' + v);
    });
    if(extra) lines = lines.concat(extra);
    return lines.join('\n');
  };
  /* рекламные метки: запоминаем на время визита, уходят с заявкой (send.php знает эти поля) */
  ICE.utm = function(){
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'yclid', 'gclid'], got = {}, q = new URLSearchParams(location.search), any = false;
    keys.forEach(function(k){ var v = q.get(k); if(v){ got[k] = v.slice(0, 200); any = true; } });
    if(q.get('h')){ got.variant = 'h=' + q.get('h').slice(0, 40); any = true; }
    /* Сессии не хватает: по рекламе зашли, ушли подумать, вернулись через день напрямую —
       заявка должна остаться с меткой. Поэтому дублируем в localStorage на 30 дней,
       а сессия остаётся приоритетной (последний клик в рамках визита). */
    try{
      if(any){
        sessionStorage.setItem('ice-utm', JSON.stringify(got));
        localStorage.setItem('ice-utm-last', JSON.stringify({t: Date.now(), v: got}));
      } else {
        got = JSON.parse(sessionStorage.getItem('ice-utm') || 'null');
        if(!got){
          var saved = JSON.parse(localStorage.getItem('ice-utm-last') || 'null');
          got = (saved && Date.now() - saved.t < 30 * 864e5) ? saved.v : {};
        }
      }
    }catch(e){ got = got || {}; }
    return got || {};
  };
  function forms(){
    try{ ICE.utm(); }catch(e){}
    /* «Начал заполнять» — показывает, доходит ли трафик до формы вообще:
       без этой отметки падение конверсии не отличить от «форму не увидели». */
    var started = {};
    document.addEventListener('input', function(e){
      var f = e.target.closest && e.target.closest('form[data-form]'); if(!f) return;
      var id = f.getAttribute('data-form') || 'lead';
      if(started[id]) return; started[id] = 1;
      ICE.goal('form_start', {form: id});
    }, true);
    document.addEventListener('submit', function(e){
      var f = e.target.closest('form[data-form]'); if(!f) return;
      e.preventDefault();
      var hp = $('input[name=website]', f); if(hp && hp.value) return;
      var c = $('input[name=consent]', f);
      if(c && !c.checked){ c.focus(); c.closest('.check').animate([{transform:'translateX(0)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}], {duration:260, iterations:2}); return; }
      var extra = f._extra ? f._extra() : null;
      // send.php: имя обязательно (от 2 букв) — у форм «только телефон» подставляем «Без имени»; согласие — обязательно
      var payload = {form: f.getAttribute('data-form'), name: (($('[name=name]', f) || {}).value || '').trim() || 'Без имени', phone: (($('[name=phone]', f) || {}).value || '').trim(), message: ICE.packMessage(f, extra), page: location.pathname, consent: c && c.checked ? '1' : ''};
      var utm = ICE.utm(); Object.keys(utm).forEach(function(k){ payload[k] = utm[k]; });
      var cid = ICE.cid(); if(cid) payload.ym_cid = cid;
      /* Номер визита Roistat — по нему он связывает сделку в CRM с рекламным кликом.
         Пока Roistat не подключён, cookie нет и поле просто не уходит. */
      try{
        var rv = (document.cookie.match(/(?:^|;\s*)roistat_visit=([^;]+)/) || [])[1];
        if(rv) payload.roistat_visit = decodeURIComponent(rv);
      }catch(e){}
      try{ (window.dataLayer = window.dataLayer || []).push({event:'lead_submit', form: payload.form}); }catch(err){}
      if(html.hasAttribute('data-draft')){
        var ok = $('.form__ok', f);
        if(ok){ $('pre', ok).textContent = 'Форма: ' + payload.form + '\nИмя: ' + payload.name + '\nТелефон: ' + payload.phone + (payload.message ? '\n' + payload.message : '') + '\nСтраница: ' + payload.page; }
        f.classList.add('is-sent'); f.dispatchEvent(new CustomEvent('ice:sent', {bubbles:true})); return;
      }
      var fd = new FormData(); Object.keys(payload).forEach(function(k){ fd.append(k, payload[k]); });
      fetch(f.getAttribute('action') || '/send.php', {method:'POST', body:fd}).then(function(r){ return r.json().catch(function(){ return {ok: r.ok}; }); }).catch(function(){ return {ok: false}; }).then(function(res){
        if(res && res.ok){
          f.classList.add('is-sent'); f.dispatchEvent(new CustomEvent('ice:sent', {bubbles:true}));
          /* Две цели сразу: общая 'lead' — на неё оптимизируются кампании (конверсий
             больше, обучение быстрее), раздельная — чтобы видеть цену заявки по посадочной.
             ⚠️ Раздельная НЕ называется lead_*: у цели 664235201 условие «содержит lead»,
             и любое событие со словом lead внутри засчиталось бы в неё второй раз —
             заявок в отчёте стало бы вдвое больше, чем на самом деле. */
          ICE.goal('lead', {form: payload.form});
          ICE.goal('cnv_' + ICE.section(), {form: payload.form});
        }
        else ICE.toast((res && res.error) || 'Не отправилось. Позвоните нам — ответим сразу.');
      });
    });
  }

  /* ── поиск ─────────────────────────────────────────────────────────────── */
  function search(){
    var box = $('[data-search]'); if(!box) return;
    var input = $('.search__input', box), res = $('.search__res', box), idx = null, act = -1;
    function norm(s){ return (s || '').toLowerCase().replace(/ё/g, 'е').replace(/[«»"']/g, ''); }
    function open(){ box.classList.add('is-open'); ICE.lock(true); setTimeout(function(){ input.focus(); }, 50);
      if(!idx) fetch(box.getAttribute('data-index')).then(function(r){ return r.json(); }).then(function(d){ idx = d; idx.forEach(function(x){ x.h = norm(x.t + ' ' + (x.k || '') + ' ' + (x.m || '')); }); run(); }).catch(function(){}); }
    function close(){ box.classList.remove('is-open'); ICE.lock(false); }
    $$('[data-search-open]').forEach(function(b){ b.addEventListener('click', function(e){ e.preventDefault(); open(); }); });
    $$('[data-search-close]', box).forEach(function(b){ b.addEventListener('click', close); });
    $('.search__veil', box).addEventListener('click', close);
    addEventListener('keydown', function(e){
      if(e.key === '/' && !box.classList.contains('is-open') && !/INPUT|TEXTAREA|SELECT/.test((document.activeElement || {}).tagName)){ e.preventDefault(); open(); }
      if(!box.classList.contains('is-open')) return;
      if(e.key === 'Escape') close();
      var items = $$('.search__col a', res);
      if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){ e.preventDefault(); act = Math.max(0, Math.min(items.length - 1, act + (e.key === 'ArrowDown' ? 1 : -1))); items.forEach(function(a, i){ a.classList.toggle('is-act', i === act); }); items[act] && items[act].scrollIntoView({block:'nearest'}); }
      if(e.key === 'Enter' && items[act]){ e.preventDefault(); location.href = items[act].href; }
    });
    function run(){
      var q = norm(input.value.trim()); act = -1;
      if(!idx){ res.innerHTML = '<p class="search__hint">Загружаю каталог…</p>'; return; }
      var groups = {}, order = [], toks = q.split(/\s+/).filter(Boolean);
      var list = toks.length ? idx.filter(function(x){ return toks.every(function(t){ return x.h.indexOf(t) >= 0; }); }) : idx.filter(function(x){ return x.f; });
      list.sort(function(a, b){ var pa = toks.length ? a.h.indexOf(toks[0]) : 0, pb = toks.length ? b.h.indexOf(toks[0]) : 0; return (a.g > b.g) - (a.g < b.g) || pa - pb; });
      list.slice(0, 60).forEach(function(x){ if(!groups[x.g]){ groups[x.g] = []; order.push(x.g); } if(groups[x.g].length < 8) groups[x.g].push(x); });
      if(!order.length){ res.innerHTML = '<p class="search__hint">Ничего не нашли. Попробуйте артикул (например, 101) или назначение: «купальник», «тент».</p>'; return; }
      res.innerHTML = order.map(function(g){
        return '<div class="search__col"><h4>' + g.replace(/^\d+ /, '') + '</h4><ul>' + groups[g].map(function(x){
          return '<li><a href="' + x.u + '">' + (x.i ? '<img src="' + x.i + '" alt="" loading="lazy">' : '<span class="noimg"></span>') + '<span><span class="t">' + esc(x.t) + '</span>' + (x.m ? '<span class="m">' + esc(x.m) + '</span>' : '') + '</span></a></li>';
        }).join('') + '</ul></div>';
      }).join('');
    }
    function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
    input.addEventListener('input', run);
  }

  /* ── черновик: жёлтые пометки «уточнить» и «фото · заменить» ───────────── */
  function draftNote(){
    var n = $('[data-draft-note]'); if(!n) return;
    try{ if(localStorage.getItem('ice-draft-off') === '1') html.classList.add('draft-off'); }catch(e){}
    n.addEventListener('click', function(){ var off = html.classList.toggle('draft-off'); try{ localStorage.setItem('ice-draft-off', off ? '1' : '0'); }catch(e){} });
  }

  /* уведомление о cookie: один раз, ответ храним локально (ключ — как на прежнем сайте, повторно не спросим) */
  function cookieBar(){
    var bar = $('[data-ckbar]'); if(!bar) return;
    var seen = false; try{ seen = localStorage.getItem('ib_cookie_ok') === '1'; }catch(e){}
    if(seen) return;
    bar.hidden = false; requestAnimationFrame(function(){ bar.classList.add('is-on'); });
    $('[data-ckbar-ok]', bar).addEventListener('click', function(){
      try{ localStorage.setItem('ib_cookie_ok', '1'); }catch(e){}
      bar.classList.remove('is-on'); setTimeout(function(){ bar.hidden = true; }, 300);
    });
  }
  /* ── чат Битрикс24: источник обращения и цели в Метрику ──────────────────
     Сам виджет отдаёт в CRM только текст диалога — откуда человек пришёл,
     оператор не видит, и обращение остаётся без рекламной метки. Передаём
     метки блоком setCustomData: они публикуются при старте сессии и видны
     оператору прямо в чате. Ключевые шаги дублируем целями Метрики.
     ⚠️ В именах целей не должно быть слова lead: у общей цели «Заявка с формы»
     условие «содержит lead», и такое событие засчиталось бы в неё вторым разом. */
  function b24chat(){
    var bound = false;
    function bind(w){
      if(bound || !w || !w.subscribe) return; bound = true;
      function push(){
        var grid = [], utm = ICE.utm();
        function row(name, value){ if(value) grid.push({NAME: name, VALUE: String(value), DISPLAY: 'LINE'}); }
        row('Страница', location.origin + location.pathname);
        row('Раздел', ICE.section());
        row('Источник', utm.utm_source);
        row('Канал', utm.utm_medium);
        row('Кампания', utm.utm_campaign);
        row('Фраза', utm.utm_term);
        row('Яндекс (yclid)', utm.yclid);
        row('ClientID Метрики', ICE.cid());
        try{
          var rv = (document.cookie.match(/(?:^|;\s*)roistat_visit=([^;]+)/) || [])[1];
          row('Визит Roistat', rv ? decodeURIComponent(rv) : '');
        }catch(_){}
        if(grid.length) try{ w.setCustomData([{GRID: grid}]); }catch(_){}
      }
      push();
      function on(type, fn){
        try{ w.subscribe({type: BX.LiveChatWidget.SubscriptionType[type], callback: fn}); }catch(_){}
      }
      /* ClientID Метрики приходит асинхронно — к открытию чата он уже есть,
         поэтому метки пересобираем ещё раз, до старта диалога. */
      on('widgetOpen', function(){ push(); ICE.goal('chat_open'); });
      var sent = false;
      on('userMessage', function(){ if(sent) return; sent = true; ICE.goal('chat_msg'); });
    }
    addEventListener('onBitrixLiveChat', function(e){ bind(e.detail && e.detail.widget); });
    /* Страховка: виджет пересоздают в портале (меняется и его код), и штатное
       событие может не прийти — тогда берём виджет из глобальной переменной,
       которую заводит сам загрузчик. Без этого метки молча перестали бы уходить. */
    var tries = 0, t = setInterval(function(){
      if(bound || ++tries > 40){ clearInterval(t); return; }
      if(window.BXLiveChat){ clearInterval(t); bind(window.BXLiveChat); }
    }, 500);
  }

  /* ── отложенные кадры (карта) ───────────────────────────────────────────
     ⚠️ loading="lazy" у <iframe> Safari игнорирует, поэтому карта грузилась
     сразу и тянула событие load страницы до ~20 с. Ставим адрес сами, когда
     кадр подходит к экрану. */
  function lazyFrames(){
    var frames = [].slice.call(document.querySelectorAll('iframe[data-src]'));
    if(!frames.length) return;
    if(!('IntersectionObserver' in window)){
      frames.forEach(function(f){ f.src = f.getAttribute('data-src'); });
      return;
    }
    var io = new IntersectionObserver(function(es){
      es.forEach(function(e){
        if(!e.isIntersecting) return;
        var f = e.target;
        f.src = f.getAttribute('data-src');
        f.removeAttribute('data-src');
        io.unobserve(f);
      });
    }, {rootMargin: '300px 0px'});
    frames.forEach(function(f){ io.observe(f); });
  }

  /* Переходы на соседние сайты группы: с главной на tkany.com ведёт 31 ссылка,
     и без отметки не видно, сколько трафика туда уходит. */
  function outbound(){
    document.addEventListener('click', function(e){
      var a = e.target.closest && e.target.closest('a[href]'); if(!a) return;
      var h = a.getAttribute('href') || '';
      if(h.indexOf('tkany.com') > -1) ICE.goal('out_tkany', {from: location.pathname});
      else if(h.indexOf('emdi.ru') > -1) ICE.goal('out_emdi', {from: location.pathname});
    }, true);
  }

  function init(){ header(); sideMenu(); reveal(); heroVideo(); rails(); hscroll(); accordions(); themes(); yacht(); liquid(); sheets(); forms(); search(); draftNote(); loader(); cookieBar(); b24chat(); lazyFrames(); outbound(); }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
