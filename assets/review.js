/* Показ tkany.com клиенту (GitHub Pages): кнопка «Замечание к странице».
   Замечания копятся в браузере клиента (localStorage) с адресом и названием страницы,
   отправляются разом: «Скопировать» или «Отправить в Telegram». Сервера нет — ничего никуда не уходит само.
   Подключает tools/publish_tkany_preview.py, на стенд и на бой не попадает. */
(function(){
  'use strict';
  var KEY = 'cpk7-notes';
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY) || '[]'); }catch(e){ return []; } }
  function save(a){ try{ localStorage.setItem(KEY, JSON.stringify(a)); }catch(e){} }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function page(){ var h = document.querySelector('h1'); return (h ? h.textContent : document.title).replace(/\s+/g, ' ').trim().slice(0, 80); }
  function text(a){
    return 'Замечания к новому сайту tkany.com\n\n' + a.map(function(n, i){
      return (i + 1) + '. ' + n.p + '\n' + n.u + '\n' + n.x;
    }).join('\n\n');
  }

  var css = '.rv-btn{position:fixed;right:0;top:50%;transform:translateY(-50%) rotate(180deg);writing-mode:vertical-rl;z-index:9998;padding:16px 11px;border:0;background:#16130F;color:#F4F1E8;' +
    'font:500 11px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;gap:10px;box-shadow:0 6px 18px rgba(0,0,0,.18)}' +
    '.rv-btn:hover,.rv-btn[aria-expanded=true]{background:#F8F000;color:#16130F}.rv-btn b{background:#F8F000;color:#16130F;min-width:20px;height:20px;display:grid;place-items:center;font-weight:500;writing-mode:horizontal-tb;transform:rotate(180deg)}' +
    '.rv-btn:hover b,.rv-btn[aria-expanded=true] b{background:#16130F;color:#F8F000}' +
'.rv{position:fixed;right:52px;top:50%;transform:translateY(-50%);z-index:9999;width:min(380px,calc(100vw - 68px));max-height:calc(100svh - 40px);overflow:auto;background:#FBF9F3;color:#16130F;' +
    'border:1px solid #16130F;box-shadow:0 12px 40px rgba(0,0,0,.22);padding:18px;font:15px/1.4 Onest,system-ui,sans-serif}.rv[hidden]{display:none}' +
    '.rv h3{margin:0 0 4px;font-weight:400;font-size:20px;letter-spacing:-.02em}.rv .s{margin:0 0 12px;color:#5b564c;font-size:13px}' +
    '.rv textarea{width:100%;min-height:96px;border:1px solid #16130F;background:#fff;padding:10px;font:inherit;resize:vertical;border-radius:0}' +
    '.rv .r{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}.rv button{height:38px;padding:0 12px;border:1px solid #16130F;background:transparent;color:#16130F;' +
    'font:500 10.5px/1 "IBM Plex Mono",ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;border-radius:0}' +
    '.rv button.p{background:#16130F;color:#F4F1E8}.rv button:hover{background:#F8F000;border-color:#F8F000;color:#16130F}' +
    '.rv ol{margin:14px 0 0;padding:14px 0 0 18px;border-top:1px solid rgba(22,19,15,.18);font-size:13px}.rv li{margin:0 0 8px}.rv li i{display:block;font-style:normal;color:#5b564c;font-size:12px}' +
    '.rv li a{color:inherit}.rv .x{border:0;height:auto;padding:0 0 0 6px;background:none;color:#b3261e;font-size:10px}.rv .ok{color:#1F5C42;font-size:12px;margin-top:8px;min-height:16px}' +
    '';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'rv-btn'; btn.setAttribute('aria-expanded', 'false');
  var box = document.createElement('div');
  box.className = 'rv'; box.hidden = true; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Замечания');
  box.innerHTML = '<h3>Замечание к странице</h3><p class="s">Напишите, что поправить, — запомним вместе с адресом страницы. Когда закончите, отправьте все разом.</p>' +
    '<textarea placeholder="Например: на карточке не видно цены"></textarea>' +
    '<div class="r"><button type="button" class="p" data-a="add">Добавить</button></div>' +
    '<ol></ol><div class="r" data-all><button type="button" data-a="copy">Скопировать все</button><button type="button" data-a="tg">Отправить в Telegram</button><button type="button" data-a="clear">Очистить</button></div><div class="ok" role="status"></div>';
  document.body.appendChild(box); document.body.appendChild(btn);
  var ta = box.querySelector('textarea'), ol = box.querySelector('ol'), ok = box.querySelector('.ok'), all = box.querySelector('[data-all]');

  function render(){
    var a = load();
    btn.innerHTML = 'Замечания' + (a.length ? ' <b>' + a.length + '</b>' : '');
    all.hidden = !a.length; ol.hidden = !a.length;
    ol.innerHTML = a.map(function(n, i){
      return '<li>' + esc(n.x) + '<i><a href="' + esc(n.u) + '">' + esc(n.p) + '</a><button type="button" class="x" data-del="' + i + '">удалить</button></i></li>';
    }).join('');
  }
  btn.addEventListener('click', function(){
    box.hidden = !box.hidden; btn.setAttribute('aria-expanded', box.hidden ? 'false' : 'true');
    if(!box.hidden){ ok.textContent = ''; ta.focus(); }
  });
  box.addEventListener('click', function(e){
    var b = e.target.closest('button'); if(!b) return;
    var a = load();
    if(b.hasAttribute('data-del')){ a.splice(+b.getAttribute('data-del'), 1); save(a); render(); return; }
    var act = b.getAttribute('data-a');
    if(act === 'add'){
      var x = ta.value.trim(); if(!x){ ta.focus(); return; }
      a.push({u: location.href.split('#')[0], p: page(), x: x}); save(a); ta.value = ''; render();
      ok.textContent = 'Записано. Можно перейти на другую страницу и продолжить.';
    } else if(act === 'copy'){
      var t = text(a);
      (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(function(){ ok.textContent = 'Скопировано — вставьте в сообщение.'; }, function(){
        ta.value = t; ta.select(); ok.textContent = 'Выделили текст — скопируйте его вручную.';
      });
    } else if(act === 'tg'){
      window.open('https://t.me/share/url?url=' + encodeURIComponent(location.origin + location.pathname.split('/').slice(0, 2).join('/') + '/') + '&text=' + encodeURIComponent(text(a)), '_blank', 'noopener');
    } else if(act === 'clear'){
      // второе нажатие подтверждает — случайный клик не сотрёт замечания
      if(b.getAttribute('data-sure') !== '1'){ b.setAttribute('data-sure', '1'); b.textContent = 'Точно очистить?'; return; }
      b.removeAttribute('data-sure'); b.textContent = 'Очистить';
      if(a.length){ save([]); render(); ok.textContent = 'Список очищен.'; }
    }
  });
  addEventListener('keydown', function(e){ if(e.key === 'Escape' && !box.hidden){ box.hidden = true; btn.setAttribute('aria-expanded', 'false'); } });
  render();
})();
