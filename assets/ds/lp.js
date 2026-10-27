/* Посадочные и внутренние страницы iceberg.spb.ru (14 окт 2026): лид-магниты первого экрана,
   выбор из карточки → финальная форма, фильтр тканей, заголовок под объявление (?h=), калькулятор
   «Китай», мобильная панель, каталог бассейна с окном расчёта. Отправку форм делает core.js. */
(function(){
  'use strict';
  var $ = function(s, r){ return (r || document).querySelector(s); };
  var $$ = function(s, r){ return [].slice.call((r || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* 1. Лид-магниты: сегменты с бегущей плашкой, текст обещания и кнопка меняются */
  $$('[data-mag]').forEach(function(box){
    var seg = $('.lmag__seg', box), btns = $$('.lmag__seg button', box), p = $('.lmag__p', box),
        sub = $('button[type=submit] .t', box), hid = $('input[name=magnet]', box), form = $('form', box);
    function set(i, focus){
      btns.forEach(function(b, j){ b.setAttribute('aria-checked', j === i ? 'true' : 'false'); b.tabIndex = j === i ? 0 : -1; });
      seg.style.setProperty('--k', i);
      var b = btns[i];
      p.innerHTML = b.getAttribute('data-p'); if(sub) sub.textContent = b.getAttribute('data-btn');
      if(hid) hid.value = b.textContent.trim();
      if(form && b.getAttribute('data-form')) form.setAttribute('data-form', b.getAttribute('data-form'));
      if(focus) b.focus();
    }
    btns.forEach(function(b, i){
      b.addEventListener('click', function(){
        set(i);
        /* какой первый шаг выбрали: «расчёт» горячее, чем «образцы» — в отчёте это разные намерения */
        track('lm_pick', {magnet: b.textContent.trim(), form: b.getAttribute('data-form') || ''});
      });
      b.addEventListener('keydown', function(e){
        var k = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if(!k) return;
        e.preventDefault(); set((i + k + btns.length) % btns.length, true);
      });
    });
    set(0);
  });

  /* 2. Выбор из карточки (изделие, ткань) → поле финальной формы */
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('[data-pick]'); if(!b) return;
    var kv = b.getAttribute('data-pick').split('='), f = document.getElementById('leadForm'); if(!f) return;
    e.preventDefault();
    var s = f.querySelector('[name="' + kv[0] + '"]');
    if(s){ if(s.tagName === 'SELECT' && ![].some.call(s.options, function(o){ return o.value === kv[1] || o.text === kv[1]; })){ var o = document.createElement('option'); o.text = kv[1]; s.add(o); } s.value = kv[1]; }
    document.getElementById('lead').scrollIntoView({behavior: reduce ? 'auto' : 'smooth'});
    setTimeout(function(){ var n = f.querySelector('[name=phone]'); if(n) n.focus({preventScroll:true}); }, 650);
  });

  /* 3. Фильтр тканей по назначению */
  var chips = $$('[data-f]'), grid = document.getElementById('fabGrid');
  function filt(k){
    chips.forEach(function(c){ c.classList.toggle('is-on', c.getAttribute('data-f') === k); c.setAttribute('aria-pressed', c.getAttribute('data-f') === k); });
    if(grid) $$('.lfab', grid).forEach(function(card){
      card.classList.toggle('is-off', k !== 'all' && (' ' + card.getAttribute('data-apps') + ' ').indexOf(' ' + k + ' ') < 0);
    });
  }
  chips.forEach(function(c){ c.addEventListener('click', function(){ filt(c.getAttribute('data-f')); }); });

  /* 4. Заголовок под объявление: ?h=ключ */
  var vEl = document.getElementById('lpVariants');
  if(vEl){
    try{
      var V = JSON.parse(vEl.textContent), key = new URLSearchParams(location.search).get('h');
      if(key && V[key]){ document.getElementById('lpH1').innerHTML = V[key][0]; filt(V[key][1]); }
    }catch(_){}
  }

  /* 5. Калькулятор «Китай»: себестоимость одного изделия из Китая на складе покупателя (пересобран 19 окт 2026) */
  var calc = $('[data-kcalc]');
  if(calc){
    var nf = new Intl.NumberFormat('ru-RU', {maximumFractionDigits:0});
    var val = function(n){ var x = parseFloat(String(calc.elements[n].value).replace(',', '.')); return isFinite(x) ? x : 0; };
    var summary = '';
    var run = function(){
      var goods = val('price') * val('rate'), agent = goods * val('agent') / 100,
          deliv = val('weight') * val('deliv'), customs = (goods + deliv) * val('customs') / 100,
          qty = Math.max(1, val('qty')), docs = val('docs') / qty,
          base = goods + agent + deliv + customs + docs,
          k = 1 - Math.min(val('defect'), 90) / 100, unit = base / k, loss = unit - base;
      $('#cUnit').textContent = nf.format(unit);
      $('#cTotal').textContent = nf.format(unit * qty);
      $('#cQty').textContent = nf.format(qty);
      var rows = [['Цена фабрики', goods, 'f'], ['Доставка', deliv, 'd'], ['Пошлина и НДС', customs, 'c'],
                  ['Комиссия агента', agent, 'a'], ['Сертификация, маркировка', docs, 's'], ['Потери на браке', loss, 'b']];
      var pct = function(x){ return unit > 0 ? x / unit * 100 : 0; };
      $('#cBar').innerHTML = rows.map(function(r){ return '<i class="k-' + r[2] + '" style="width:' + pct(r[1]).toFixed(2) + '%"></i>'; }).join('');
      $('#cList').innerHTML = rows.map(function(r){ return '<li><span><i class="k-' + r[2] + '"></i>' + r[0] + '</span><span>' + nf.format(r[1]) + ' ₽ <em>' + Math.round(pct(r[1])) + '%</em></span></li>'; }).join('');
      summary = 'Китай: ' + val('price') + ' ¥ × ' + val('rate') + ' ₽, партия ' + qty + ' шт → ' + nf.format(unit) + ' ₽/шт на складе';
    };
    var used = false;
    calc.addEventListener('input', function(){
      run();
      /* Считал сам — значит вник в тему и сравнивает; самый горячий сигнал на этой странице. */
      if(!used){ used = true; track('calc_use', {}); }
    });
    run();
    calc.addEventListener('submit', function(e){ e.preventDefault(); });
    var send = $('[data-calc-send]');
    if(send) send.addEventListener('click', function(){
      $$('input[name=calc]').forEach(function(h){ h.value = summary; });
      track('calc_send', {});
    });
  }

  /* 6. Мобильная панель — после первого экрана, прячется у финальной формы */
  var bar = $('.lmbar'), heroEl = $('.lhero'), fin = document.getElementById('lead');
  if(bar && heroEl && 'IntersectionObserver' in window){
    var pastHero = false, atFinal = false, upd = function(){ bar.classList.toggle('is-on', pastHero && !atFinal); };
    new IntersectionObserver(function(es){ pastHero = !es[0].isIntersecting; upd(); }).observe(heroEl);
    if(fin) new IntersectionObserver(function(es){ atFinal = es[0].isIntersecting; upd(); }, {threshold:.15}).observe(fin);
  }

  /* 7. Каталог бассейна: вкладки + окно «Расчёт партии» */
  var pool = $('[data-pool]');
  if(pool){
    var tabs = $$('[data-tab-btn]');
    tabs.forEach(function(t){ t.addEventListener('click', function(){
      var k = t.getAttribute('data-tab-btn');
      tabs.forEach(function(x){ x.classList.toggle('is-on', x === t); x.setAttribute('aria-pressed', x === t); });
      $$('.lpm', pool).forEach(function(m){ m.hidden = k !== 'all' && m.getAttribute('data-cat') !== k; });
    }); });
    pool.addEventListener('click', function(e){
      var m = e.target.closest('.lpm'); if(!m || !window.ICE) return;
      ICE.openSheet('pool', function(s){
        $('[data-pool-title]', s).textContent = m.getAttribute('data-name');
        $('[data-pool-meta]', s).textContent = 'арт. ' + m.getAttribute('data-art') + (m.getAttribute('data-size') ? ' · ' + m.getAttribute('data-size') : '');
        var img = $('[data-pool-img]', s); img.src = $('img', m).currentSrc || $('img', m).src;
        $('input[name=model]', s).value = m.getAttribute('data-name') + ', арт. ' + m.getAttribute('data-art');
        var f = $('form', s); f.classList.remove('is-sent'); f.setAttribute('data-form', 'pool-' + m.getAttribute('data-art'));
      });
    });
  }

  /* ══ КОНВЕРСИЯ (14 окт 2026, итерация 2) — разметка в tools/lp_conv.py ══ */
  var escH = function(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
  /* микроконверсии для перфоманса: шаги квиза, открытие ткани, раскрытие возражения → dataLayer */
  /* Раньше микроконверсии уходили только в dataLayer, а GTM на сайте нет — то есть в пустоту.
     Теперь через ICE.goal: то же событие становится целью в Метрике. */
  var track = function(ev, data){ try{ (window.ICE && ICE.goal ? ICE.goal : function(){})(ev, data || {}); }catch(_){} };
  var go = function(id){ var t = document.getElementById(id); if(t) t.scrollIntoView({behavior: reduce ? 'auto' : 'smooth', block:'start'}); };

  /* 8. Оглавление: липкая полоса под шапкой, плашка на текущем разделе, прогресс прокрутки */
  var nav = $('[data-cnav]');
  if(nav){
    var head = $('[data-head]'), links = $$('a[data-spy]', nav), pill = $('.cnav__pill', nav), box = $('.cnav__links', nav),
        secs = links.map(function(a){ return document.getElementById(a.getAttribute('data-spy')); }), cur = -1, ticking = false;
    var setTop = function(){
      var t = head && !head.classList.contains('is-hidden') ? head.getBoundingClientRect().height : 0;
      document.documentElement.style.setProperty('--cnav-top', Math.max(0, Math.round(t)) + 'px');
    };
    if(head && 'MutationObserver' in window) new MutationObserver(setTop).observe(head, {attributes:true, attributeFilter:['class']});
    var mark = function(i){
      if(i === cur) return; cur = i;
      links.forEach(function(a, j){ a.classList.toggle('is-on', j === i); if(j === i) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
      if(i < 0){ pill.style.width = '0px'; return; }
      var a = links[i]; pill.style.width = a.offsetWidth + 'px'; pill.style.transform = 'translateX(' + a.offsetLeft + 'px)';
      if(box.scrollWidth > box.clientWidth) box.scrollTo({left: a.offsetLeft - 24, behavior: reduce ? 'auto' : 'smooth'});
    };
    var spy = function(){
      ticking = false;
      var line = nav.getBoundingClientRect().bottom + 80, k = -1;
      secs.forEach(function(s, j){ if(s && s.getBoundingClientRect().top <= line) k = j; });
      if(k >= 0 && secs[k].getBoundingClientRect().bottom < nav.getBoundingClientRect().bottom) k = -1;   // ушли ниже последнего раздела
      mark(k);
      var max = document.documentElement.scrollHeight - innerHeight;
      nav.style.setProperty('--p', max > 0 ? Math.min(1, scrollY / max).toFixed(4) : 0);
    };
    addEventListener('scroll', function(){ if(!ticking){ ticking = true; requestAnimationFrame(spy); } }, {passive:true});
    addEventListener('resize', function(){ cur = -2; setTop(); spy(); });
    setTop(); spy();
  }

  /* 9. Изделия: вкладки (клик, наведение, стрелки) */
  var hover = matchMedia('(hover:hover) and (pointer:fine)').matches;
  $$('[data-cpx]').forEach(function(bx){
    var tabs = $$('[role=tab]', bx), panels = $$('.cpx__panel', bx);
    var set = function(i, focus){
      tabs.forEach(function(t, j){ t.setAttribute('aria-selected', j === i ? 'true' : 'false'); t.tabIndex = j === i ? 0 : -1; });
      panels.forEach(function(p, j){ p.classList.toggle('is-on', j === i); });
      if(focus) tabs[i].focus();
    };
    tabs.forEach(function(t, i){
      t.addEventListener('click', function(){ set(i); });
      if(hover) t.addEventListener('mouseenter', function(){ set(i); });
      t.addEventListener('keydown', function(e){
        var k = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0; if(!k) return;
        e.preventDefault(); set((i + k + tabs.length) % tabs.length, true);
      });
    });
  });

  /* 10. Ткани в наличии: окно со всеми цветами, отметка цветов для образцов */
  var sd = document.getElementById('stockData'), sheet = document.getElementById('stockSheet');
  if(sd && sheet){
    var SD = {}; try{ SD = JSON.parse(sd.textContent); }catch(_){}
    var grid = $('[data-st-grid]', sheet), sform = $('form', sheet), picked = $('[data-st-picked]', sheet), pickedDef = picked.textContent;
    var sync = function(){
      var on = $$('.cstock__c[aria-pressed=true]', grid).map(function(b){ return b.getAttribute('data-sku') + ' ' + b.getAttribute('data-name'); });
      sform.elements.colors.value = on.join(', ');
      picked.textContent = on.length ? 'Выбрано ' + on.length + ': ' + on.join(', ') : pickedDef;
    };
    document.addEventListener('click', function(e){
      var b = e.target.closest && e.target.closest('[data-stock]'); if(!b || !window.ICE) return;
      var a = SD[b.getAttribute('data-stock')]; if(!a) return;
      ICE.openSheet('stockSheet', function(s){
        $('[data-st-name]', s).textContent = a.n;
        $('[data-st-code]', s).textContent = 'арт. ' + a.code + (a.price ? ' · ' + a.price : '');
        $('[data-st-spec]', s).textContent = [a.spec, a.desc].filter(Boolean).join(' — ');
        $('[data-st-count]', s).textContent = 'В наличии · ' + a.c.length + ' цв.';
        grid.innerHTML = a.c.map(function(c){
          return '<button type="button" class="cstock__c" aria-pressed="false" data-sku="' + escH(c[0]) + '" data-name="' + escH(c[1]) + '"><img src="' + escH(c[2]) + '" alt="" loading="lazy"><span>' + escH(c[0]) + '</span><small>' + escH(c[1]) + '</small></button>';
        }).join('');
        sform.classList.remove('is-sent'); sform.elements.fabric.value = a.n + ', арт. ' + a.code; sync();
      });
      track('stock_open', {fabric: a.code});
    });
    grid.addEventListener('click', function(e){
      var c = e.target.closest('.cstock__c'); if(!c) return;
      c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); sync();
    });
  }
  /* фильтр полотен по назначению (страница тканей) + заголовок под объявление */
  var sfChips = $$('[data-sf]');
  var sfilt = function(k){
    var tag = null;
    sfChips.forEach(function(c){ var on = c.getAttribute('data-sf') === k; c.classList.toggle('is-on', on); c.setAttribute('aria-pressed', on); if(on) tag = c.getAttribute('data-tag'); });
    $$('.cfab').forEach(function(card){ card.classList.toggle('is-off', !!tag && (' ' + card.getAttribute('data-apps') + ' ').indexOf(' ' + tag + ' ') < 0); });
  };
  sfChips.forEach(function(c){ c.addEventListener('click', function(){ sfilt(c.getAttribute('data-sf')); }); });
  if(vEl && sfChips.length){
    try{ var V2 = JSON.parse(vEl.textContent), k2 = new URLSearchParams(location.search).get('h'); if(k2 && V2[k2]) sfilt(V2[k2][1]); }catch(_){}
  }

  /* 11. Возражения: карточка переворачивается */
  document.addEventListener('click', function(e){
    var c = e.target.closest && e.target.closest('.cobj'); if(!c) return;
    var open = c.getAttribute('aria-pressed') !== 'true';
    c.setAttribute('aria-pressed', open ? 'true' : 'false');
    if(open) track('objection_open', {n: $$('.cobj').indexOf(c) + 1});
  });

  /* 12. Квиз-расчёт: шаги, прогресс, автопереход, сводка ответов */
  var quizzes = $$('[data-cq]');
  quizzes.forEach(function(f){
    var steps = $$('.cq__step', f), segs = $$('.cq__seg i', f), nEl = $('[data-cq-n]', f),
        back = $('[data-cq-back]', f), next = $('[data-cq-next]', f), sum = $('[data-cq-sum]', f), at = 0;
    var summary = function(){
      var out = [];
      steps.forEach(function(s, j){ $$('input[type=radio]:checked', s).forEach(function(r){ out.push('<button type="button" data-cq-to="' + j + '">' + escH(r.value) + '</button>'); }); });
      if(f.elements.who && f.elements.who.value) out.unshift('<button type="button" data-cq-to="0">' + escH(f.elements.who.value) + '</button>');
      sum.innerHTML = out.length ? out.join('') : '';
    };
    var to = function(i){
      at = Math.max(0, Math.min(steps.length - 1, i));
      steps.forEach(function(s, j){ s.classList.toggle('is-on', j === at); });
      segs.forEach(function(s, j){ s.classList.toggle('is-on', j <= at); });
      nEl.textContent = 'Шаг ' + (at + 1) + ' из ' + steps.length;
      back.disabled = at === 0; next.hidden = at === steps.length - 1;
      if(at === steps.length - 1) summary();
      if(at > 0 && !seen[at]){
        seen[at] = 1;
        if(at === 1) track('quiz_start', {form: f.getAttribute('data-form')});
        track('quiz_step', {form: f.getAttribute('data-form'), step: at + 1});
        if(at === steps.length - 1) track('quiz_done', {form: f.getAttribute('data-form')});
      }
    };
    var seen = {};
    f._cqTo = to; f._cqAt = function(){ return at; };
    f.addEventListener('change', function(e){
      if(e.target.type !== 'radio') return;
      var i = steps.indexOf(e.target.closest('.cq__step'));
      if(i === at) setTimeout(function(){ if(at === i) to(i + 1); }, 320);
    });
    next.addEventListener('click', function(){ to(at + 1); });
    back.addEventListener('click', function(){ to(at - 1); });
    sum.addEventListener('click', function(e){ var b = e.target.closest('[data-cq-to]'); if(b) to(+b.getAttribute('data-cq-to')); });
    to(0);
  });
  /* «Рассчитать это изделие», «это про нас» → ответ в квизе и прокрутка к нему */
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('[data-quiz-pick]'); if(!b || !quizzes.length) return;
    e.preventDefault();
    var f = quizzes[0], kv = b.getAttribute('data-quiz-pick').split('='), name = kv[0], val = kv.slice(1).join('=');
    if(name === 'who'){ f.elements.who.value = val; }
    else{
      var r = $$('input[type=radio]', f).filter(function(x){ return x.name === name && x.value === val; })[0];
      if(r){ r.checked = true; f._cqTo(1 + [].indexOf.call($$('.cq__step', f), r.closest('.cq__step'))); }
    }
    f.classList.remove('is-sent');
    go(f.closest('section').id);
  });
  /* «Рассчитать это изделие» на страницах без квиза (плавание, стартовые майки): ссылка ведёт к заявке,
     изделие дописывается в комментарий — менеджер сразу видит, о чём речь */
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('[data-pick-comment]'); if(!b) return;
    var sec = document.querySelector(b.getAttribute('href')), ta = sec && sec.querySelector('textarea[name=comment]');
    if(!ta) return;
    var v = 'Изделие: ' + b.getAttribute('data-pick-comment');
    if(!ta.value || ta.value === ta._picked){ ta.value = v; ta._picked = v; }
    else if(ta.value.indexOf(v) < 0){ ta.value += '\n' + v; ta._picked = null; }
  });
  /* ══ ЭКРАН ЦЕЛИКОМ (19 окт 2026): каждый блок помещается в экран ══ */
  /* 13. Переключатели: «Обычно / С нами», «Знакомо / Мешает» (на телефоне), группы «Что производим» (везде) */
  $$('[data-cswitch]').forEach(function(w){
    var btns = $$('.cswitch__bar [data-cs]', w), panes = $$('[data-cs-pane]', w);
    btns.forEach(function(b){ b.addEventListener('click', function(){
      var k = b.getAttribute('data-cs');
      btns.forEach(function(x){ x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      panes.forEach(function(p){ p.classList.toggle('is-on', p.getAttribute('data-cs-pane') === k); });
    }); });
  });

  /* 14. Ленты со стрелками (ткани на бифлексе, модели бассейна): стрелки — где лента шире экрана */
  $$('[data-cscroll]').forEach(function(row){
    var bar = document.createElement('div'); bar.className = 'cscroll__bar';
    bar.innerHTML = '<span class="cscroll__track"><i></i></span><button type="button" class="cscroll__btn" data-d="-1" aria-label="Назад">←</button><button type="button" class="cscroll__btn" data-d="1" aria-label="Вперёд">→</button>';
    row.parentNode.insertBefore(bar, row.nextSibling);
    var thumb = $('.cscroll__track i', bar), prev = $('[data-d="-1"]', bar), next = $('[data-d="1"]', bar);
    var upd = function(){
      var max = row.scrollWidth - row.clientWidth;
      bar.hidden = max < 4;
      prev.disabled = row.scrollLeft < 4; next.disabled = row.scrollLeft > max - 4;
      var vis = row.clientWidth / row.scrollWidth;
      thumb.style.width = (vis * 100) + '%'; thumb.style.transform = 'translateX(' + (max > 0 ? row.scrollLeft / max * (1 / vis - 1) * 100 : 0) + '%)';
    };
    $$('button', bar).forEach(function(b){ b.addEventListener('click', function(){
      row.scrollBy({left: +b.getAttribute('data-d') * row.clientWidth * .85, behavior: reduce ? 'auto' : 'smooth'});
    }); });
    row.addEventListener('scroll', function(){ requestAnimationFrame(upd); }, {passive:true});
    addEventListener('resize', upd);
    new MutationObserver(upd).observe(row, {subtree:true, attributes:true, attributeFilter:['class', 'hidden']});
    upd();
  });

  /* 15. Длинные тексты: свёрнуты до экрана, «Читать полностью» (текст в разметке целиком — для поиска) */
  $$('[data-cfold]').forEach(function(f){
    var b = document.createElement('button'); b.type = 'button'; b.className = 'cfold__btn';
    b.innerHTML = '<span>Читать полностью</span> <span aria-hidden="true">↓</span>';
    f.parentNode.insertBefore(b, f.nextSibling);
    var check = function(){ var fold = f.scrollHeight > f.clientHeight + 40 || f.classList.contains('is-open'); b.hidden = !fold; f.classList.toggle('is-short', !fold); };
    b.addEventListener('click', function(){
      var open = f.classList.toggle('is-open');
      b.firstChild.textContent = open ? 'Свернуть' : 'Читать полностью'; b.lastChild.textContent = open ? '↑' : '↓';
      if(!open) f.scrollIntoView({block:'start', behavior: reduce ? 'auto' : 'smooth'});
    });
    addEventListener('load', check); check();
  });
  /* 17. Телефон и планшет: дополнительные параметры калькулятора — свёрнуты */
  if(matchMedia('(max-width:900px)').matches) $$('details[data-mobile-closed]').forEach(function(d){ d.removeAttribute('open'); });

  /* 16. Телефон: длинные пояснения под заголовками блоков — 3 строки и «Подробнее» */
  if(matchMedia('(max-width:760px)').matches){
    $$('.lhead p.t-lead, .lwhy__l p.t-lead').forEach(function(p){
      p.classList.add('cclamp');
      if(p.scrollHeight <= p.clientHeight + 4){ p.classList.remove('cclamp'); return; }
      var b = document.createElement('button'); b.type = 'button'; b.className = 'cclamp__btn mono'; b.textContent = 'Подробнее ↓';
      p.parentNode.insertBefore(b, p.nextSibling);
      b.addEventListener('click', function(){ var o = p.classList.toggle('is-open'); b.textContent = o ? 'Свернуть ↑' : 'Подробнее ↓'; });
    });
  }
})();
