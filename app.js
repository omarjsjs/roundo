/* Roundo v15 – ES5, modes fix + new Trophy avatar + content.json questions */
(function(){
  'use strict';

  /* ================== i18n ================== */
  var STR = {
    ar:{app:"راوندو",badge:"نموذج",home:"الرئيسية",modes:"أنماط اللعب",lobby:"اللوبي",store:"المتجر",
        splashTitle:"الشاشة الافتتاحية",quickPlay:"مباراة سريعة",playNow:"ابدأ الآن",
        modesTitle:"أنماط اللعب",lobbyTitle:"اللوبي",storeTitle:"المتجر",avatarTitle:"شخصيتي",
        questionTitle:"السؤال",resultsTitle:"النتائج",abilities:"القدرات",traps:"الفخاخ",progress:"التقدم",
        owned:"مملوك",buy:"شراء",equip:"تجهيز",unequip:"إزالة",coins:"عملة",gems:"جوهرة",
        free:"مجاني",inProgress:"قريبًا",notEnough:"لا توجد عملات كافية",
        correct:"إجابة صحيحة!",wrong:"إجابة خاطئة",next:"التالي",again:"العب مجددًا",
        nothingEquipped:"لا شيء مجهّز", players:"اللاعبون", rotate:"فضلاً استخدم الجهاز بوضع الطول",
        score:"النقاط", streak:"سلسلة", reward:"المكافأة",
        startMatch:"ابدأ المباراة", timePerQ:"الوقت لكل سؤال", powerups:"القدرات", on:"تشغيل", off:"إيقاف",
        mode:"النمط", you:"أنت"},
    en:{app:"Roundo",badge:"Prototype",home:"Home",modes:"Game Modes",lobby:"Lobby",store:"Store",
        splashTitle:"Splash",quickPlay:"Quick Play",playNow:"Play Now",
        modesTitle:"Game Modes",lobbyTitle:"Lobby",storeTitle:"Store",avatarTitle:"My Avatar",
        questionTitle:"Question",resultsTitle:"Results",abilities:"Abilities",traps:"Traps",progress:"Progress",
        owned:"Owned",buy:"Buy",equip:"Equip",unequip:"Unequip",coins:"Coin",gems:"Gem",
        free:"Free",inProgress:"Coming soon",notEnough:"Not enough coins",
        correct:"Correct!",wrong:"Wrong",next:"Next",again:"Play Again",
        nothingEquipped:"Nothing equipped", players:"Players", rotate:"Please use portrait orientation",
        score:"Score", streak:"Streak", reward:"Reward",
        startMatch:"Start Match", timePerQ:"Time per question", powerups:"Power-ups", on:"On", off:"Off",
        mode:"Mode", you:"You"}
  };

  /* ================== helpers ================== */
  function $(s, r){ return (r||document).querySelector(s); }
  function $all(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
  function t(k){ return (STR[lang] && STR[lang][k]) || k; }
  function safeText(id, txt){ var el=$("#"+id); if(el) el.textContent=txt; }
  function shuffle(a){
    for (var i=a.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=a[i]; a[i]=a[j]; a[j]=tmp; }
    return a;
  }

  /* ================== state ================== */
  var urlLang = (new URLSearchParams(location.search)).get("lang");
  var lang  = urlLang || localStorage.getItem("roundo_lang")  || "ar";
  var theme = localStorage.getItem("roundo_theme") || "dark";

  var state = {
    route: (location.hash.replace("#/","") || "splash"),
    wallet:   JSON.parse(localStorage.getItem("roundo_wallet")   || '{"coins":2000,"gems":150}'),
    owned:    JSON.parse(localStorage.getItem("roundo_owned")    || "[]"),
    equipped: JSON.parse(localStorage.getItem("roundo_equipped") || '{"headband":null,"scarf":null,"visor":null,"cape":null,"charm":null}'),
    content: null,
    currentMode: null,
    questionIx: 0, score: 0, streak: 0, _awarded:false,
    _qAdvanced:false, _timerId:null, _remaining:20000,
    lobby:{players:2, timeMs:20000, powerups:true}
  };

  function saveOwned(){  localStorage.setItem("roundo_owned", JSON.stringify(state.owned)); }
  function saveWallet(){ localStorage.setItem("roundo_wallet", JSON.stringify(state.wallet)); }
  function saveEquipped(){ localStorage.setItem("roundo_equipped", JSON.stringify(state.equipped)); }

  function fmtPrice(p){ return !p ? t("free") : (p.coins ? (p.coins+" "+t("coins")) : (p.gems+" "+t("gems"))); }

  // mount #app if missing
  function getApp(){
    var app=$("#app");
    if(!app){
      app=document.createElement("main"); app.id="app";
      var header=$("header")||document.body;
      header.parentNode.insertBefore(app, header.nextSibling);
    }
    return app;
  }

  /* ================== routing & theme/lang ================== */
  window.addEventListener("hashchange", function(){
    state.route = location.hash.replace("#/","") || "splash";
    render();
  });

  function setLang(l){
    lang=l; localStorage.setItem("roundo_lang",l);
    document.documentElement.lang=l; document.documentElement.dir=(l==="ar"?"rtl":"ltr");
    safeText("t_app", t("app")); safeText("t_badge", STR[lang].badge);
    safeText("t_home", t("home")); safeText("t_modes", t("modes"));
    safeText("t_lobby", t("lobby")); safeText("t_store", t("store"));
    var bl=$("#btnLang"); if(bl) bl.textContent=(l==="ar"?"EN":"AR");
    render();
  }
  function setTheme(m){
    theme=m; localStorage.setItem("roundo_theme",m);
    if(theme==="light") document.body.classList.add("theme-light"); else document.body.classList.remove("theme-light");
  }

  /* ================== content ================== */
  function loadContent(cb){
    if(state.content){ if(cb) cb(); return; }
    fetch("content.json",{cache:"no-store"})
      .then(function(r){ if(!r.ok) throw new Error(); return r.json(); })
      .then(function(json){ state.content=json; if(cb) cb(); })
      .catch(function(){
        // fallback بسيط
        state.content={
          characters:[{name_ar:"تروفي",name_en:"Trophy",default:{colorway:"Gold"}}],
          cosmetics:[
            {id:"headband_red",slot:"headband",price:{coins:200}},
            {id:"scarf_teal",slot:"scarf",price:{coins:180}},
            {id:"visor_purple",slot:"visor",price:{coins:150}},
            {id:"cape_violet",slot:"cape",price:{gems:5}},
            {id:"charm_sun",slot:"charm",price:null}
          ],
          store:{daily:["headband_red","scarf_teal","visor_purple"],weekly:["cape_violet","charm_sun"]},
          questions:[
            {ar:{prompt:"ما عاصمة فرنسا؟",answers:[{text:"باريس",correct:true},{text:"روما"},{text:"مدريد"},{text:"برلين"}]},
             en:{prompt:"What is the capital of France?",answers:[{text:"Paris",correct:true},{text:"Rome"},{text:"Madrid"},{text:"Berlin"}]}},
            {ar:{prompt:"٢ + ٢ = ؟",answers:[{text:"٣"},{text:"٤",correct:true},{text:"٥"},{text:"٦"}]},
             en:{prompt:"2 + 2 = ?",answers:[{text:"3"},{text:"4",correct:true},{text:"5"},{text:"6"}]}}
          ]
        };
        if(cb) cb();
      });
  }

  /* ================== layout helpers ================== */
  function wrapPhone(inner){ return '<div style="width:min(420px,94vw);margin:12px auto;display:flex;flex-direction:column;gap:12px">'+inner+'</div>'; }
  function screen(title, body){ return '<section class="card" style="width:100%"><div class="h1">'+title+'</div>'+body+'</section>'; }

  /* ================== pages ================== */
  function renderSplash(){
    return wrapPhone(
      screen(t("splashTitle"),
        '<div class="row"><div class="kbd">'+t("quickPlay")+'</div><a class="btn cta" href="#/modes" style="flex:1">'+t("playNow")+'</a></div>' +
        screen(t("abilities"), '<div class="badge">Hint / Freeze / Shield</div>') +
        screen(t("traps"), '<div class="badge">Scramble / Fog</div>') +
        screen(t("progress"), '<div class="badge">Treasure Map</div>')
      )
    );
  }

  function renderHome(){
    return wrapPhone(screen(t("home"),
      '<a class="btn" href="#/modes" style="width:100%;margin-top:6px">'+t("modesTitle")+'</a>' +
      '<a class="btn" href="#/customization" style="width:100%;margin-top:6px">'+t("avatarTitle")+'</a>' +
      '<a class="btn" href="#/store" style="width:100%;margin-top:6px">'+t("storeTitle")+'</a>'
    ));
  }

  // ---- MODES (fixed) ----
  function renderModes(){
    var modes = [
      { id:"quick", name_ar:"مباراة سريعة", name_en:"Quick Match",
        desc_ar:"جولة أسئلة سريعة بنقاط ومؤقت.", desc_en:"Fast round with timer and scoring.",
        playable:true },
      { id:"story", name_ar:"مغامرة قصصية", name_en:"Story Adventure",
        desc_ar:"تقدّم عبر فصول وتحديات.", desc_en:"Chapters and themed challenges.",
        playable:false },
      { id:"h2h",   name_ar:"وجهاً لوجه", name_en:"Head-to-Head",
        desc_ar:"تحدَّ صديقك مباشرة.", desc_en:"Challenge a friend 1v1.",
        playable:false },
      { id:"race",  name_ar:"سباق الكنز", name_en:"Treasure Race",
        desc_ar:"اركض لتحصد النقاط قبل الآخرين.", desc_en:"Race to score before others.",
        playable:false },
      { id:"kb",    name_ar:"قنبلة المعرفة", name_en:"Knowledge Bomb",
        desc_ar:"أسئلة متتالية بوتيرة عالية.", desc_en:"Rapid-fire streak mode.",
        playable:false },
      { id:"tourn", name_ar:"بطولات", name_en:"Tournaments",
        desc_ar:"منافسات دورية وجوائز.", desc_en:"Periodic competitions with prizes.",
        playable:false }
    ];

    var list = modes.map(function(m){
      var title=(lang==="ar"?m.name_ar:m.name_en);
      var desc =(lang==="ar"?m.desc_ar:m.desc_en);
      var action = m.playable
        ? '<button class="btn cta" data-start-mode="'+m.id+'">'+t("playNow")+'</button>'
        : '<span class="badge">'+t("inProgress")+'</span>';

      return (
        '<div class="card mode-card" style="margin-top:8px">'+
          '<div class="row" style="justify-content:space-between;align-items:center;gap:8px">'+
            '<div><div class="h2" style="margin:0">'+title+'</div><small class="muted">'+desc+'</small></div>'+
            action +
          '</div>'+
        '</div>'
      );
    }).join("");

    if(!list || !list.trim()){
      list = '<div class="card"><small class="muted">No modes defined</small></div>';
    }
    return wrapPhone( screen(t("modesTitle"), list) );
  }
  function wireModes(){
    $all("[data-start-mode]").forEach(function(btn){
      btn.addEventListener("click", function(){
        state.currentMode = btn.getAttribute("data-start-mode");
        state.lobby = {players:2,timeMs:20000,powerups:true};
        state.questionIx=0; state.score=0; state.streak=0; state._awarded=false;
        location.hash="#/lobby";
      });
    });
  }

  function renderLobby(){
    return wrapPhone(screen(t("lobbyTitle"),
      '<div class="card">'+
        '<div class="row" style="justify-content:space-between">'+
          '<div><span class="badge">'+t("mode")+'</span> <strong>'+(state.currentMode||"—")+'</strong></div>'+
          '<div class="badge">'+t("players")+': '+state.lobby.players+'</div>'+
        '</div>'+
        '<div class="row" style="margin-top:8px;gap:8px">'+
          '<label class="kbd" style="flex:1">'+t("players")+
            '<select id="selPlayers" style="width:100%;margin-top:4px">'+
              '<option value="2" '+(state.lobby.players===2?'selected':'')+'>2</option>'+
              '<option value="3" '+(state.lobby.players===3?'selected':'')+'>3</option>'+
              '<option value="4" '+(state.lobby.players===4?'selected':'')+'>4</option>'+
            '</select>'+
          '</label>'+
          <label class="kbd" style="flex:1">'+t("timePerQ")+
            '<select id="selTime" style="width:100%;margin-top:4px">'+
              '<option value="10000" '+(state.lobby.timeMs===10000?'selected':'')+'>10s</option>'+
              '<option value="20000" '+(state.lobby.timeMs===20000?'selected':'')+'>20s</option>'+
              '<option value="30000" '+(state.lobby.timeMs===30000?'selected':'')+'>30s</option>'+
            '</select>'+
          '</label>'+
        '</div>'+
        '<div class="row" style="margin-top:8px;justify-content:space-between">'+
          '<div class="kbd">'+t("powerups")+': <button id="btnPower" class="btn" style="margin-inline-start:6px">'+(state.lobby.powerups?t("on"):t("off"))+'</button></div>'+
          '<a class="btn" href="#/modes">'+t("modesTitle")+'</a>'+
        '</div>'+
      '</div>'+
      '<div class="card"><div class="h2">'+t("players")+'</div><div class="row" style="gap:8px;flex-wrap:wrap">'+
        '<span class="badge">'+t("you")+'</span>'+
        Array(state.lobby.players-1).fill(0).map(function(_,i){return '<span class="badge">Friend#'+(200+i)+'</span>';}).join('')+
      '</div></div>'+
      '<button class="btn cta" id="btnStart" style="width:100%">'+t("startMatch")+'</button>'
    ));
  }
  function wireLobby(){
    var sp=$("#selPlayers"); if(sp) sp.addEventListener("change", function(e){ state.lobby.players=parseInt(e.target.value,10); render(); });
    var st=$("#selTime");    if(st) st.addEventListener("change",  function(e){ state.lobby.timeMs=parseInt(e.target.value,10); });
    var bp=$("#btnPower");   if(bp) bp.addEventListener("click",   function(){ state.lobby.powerups=!state.lobby.powerups; render(); });
    var bs=$("#btnStart");   if(bs) bs.addEventListener("click",   function(){ state.questionIx=0;state.score=0;state.streak=0;state._awarded=false; location.hash="#/question"; });
  }

  /* ================== questions ================== */
  function getQuestions(){
    // من content.json إذا وُجد، وإلا fallback
    var src = (state.content && state.content.questions) ? state.content.questions : [];
    if (src && src.length){
      return src.map(function(q){
        var pack = (lang==="ar"?q.ar:q.en);
        return {
          prompt: pack.prompt,
          answers: (pack.answers||[]).map(function(a){ return {txt:a.text, ok:!!a.correct}; })
        };
      });
    }
    // fallback (سطرين فقط)
    return [
      {prompt:(lang==="ar"?"ما عاصمة فرنسا؟":"What is the capital of France?"),
       answers:(lang==="ar"
        ? [{txt:"باريس",ok:true},{txt:"روما"},{txt:"مدريد"},{txt:"برلين"}]
        : [{txt:"Paris",ok:true},{txt:"Rome"},{txt:"Madrid"},{txt:"Berlin"}])},
      {prompt:(lang==="ar"?"٢ + ٢ = ؟":"2 + 2 = ?"),
       answers:(lang==="ar"
        ? [{txt:"٣"},{txt:"٤",ok:true},{txt:"٥"},{txt:"٦"}]
        : [{txt:"3"},{txt:"4",ok:true},{txt:"5"},{txt:"6"}])}
    ];
  }

  var Q_ORDER = []; // يُعاد توليده عند البدء
  function regenOrder(len){
    Q_ORDER = shuffle(Array(len).fill(0).map(function(_,i){return i;}));
  }

  function mmss(ms){ var s=Math.max(0,Math.ceil(ms/1000)); return Math.floor(s/60)+":"+("0"+(s%60)).slice(-2); }

  function renderQuestion(){
    var ALL = getQuestions();
    if (!Q_ORDER.length || Q_ORDER.length !== ALL.length) regenOrder(ALL.length);

    if (state._remaining !== state.lobby.timeMs) state._remaining = state.lobby.timeMs;

    var q = ALL[ Q_ORDER[state.questionIx] ];
    var opts = q.answers.map(function(a,i){ return {txt:a.txt, ok:!!a.ok, i:i}; });
    opts = shuffle(opts);

    return wrapPhone(screen(t("questionTitle"),
      '<div class="row" style="justify-content:space-between;margin-bottom:8px">'+
        '<span class="kbd">'+t("score")+': '+state.score+'</span>'+
        '<span class="kbd">'+t("streak")+': '+state.streak+'</span>'+
      '</div>'+
      '<div class="h2" style="margin-bottom:8px">'+q.prompt+'</div>'+
      '<div style="display:flex;flex-direction:column;gap:8px">'+
        opts.map(function(o){ return '<button class="opt btn" style="width:100%;text-align:start" data-ix="'+o.i+'" data-ok="'+(o.ok?'1':'0')+'">'+o.txt+'</button>'; }).join("")+
      '</div>'+
      '<div class="meta" style="margin-top:10px">'+
        '<span class="badge">Round '+(state.questionIx+1)+'/'+ALL.length+'</span>'+
        '<span class="badge" id="timer">'+mmss(state._remaining)+'</span>'+
      '</div>'+
      '<div class="row" style="margin-top:8px;justify-content:space-between">'+
        '<a class="btn" href="#/lobby">⟵ '+t("lobby")+'</a>'+
        '<button class="btn" id="nextBtn">'+t("next")+'</button>'+
      '</div>'
    ));
  }

  function startTimer(){
    clearInterval(state._timerId);
    state._remaining = state.lobby.timeMs;
    var timerEl = $("#timer");
    state._timerId = setInterval(function(){
      if (state._qAdvanced) { clearInterval(state._timerId); return; }
      state._remaining -= 100;
      if (timerEl) timerEl.textContent = mmss(state._remaining);
      if (state._remaining <= 0){
        clearInterval(state._timerId);
        state.streak = 0; state._qAdvanced = true;
        setTimeout(nextStep, 10);
      }
    }, 100);
  }

  function nextStep(){
    var ALL = getQuestions();
    if (state.questionIx < ALL.length - 1){
      state.questionIx++;
      if (state.route === "question") render(); else location.hash="#/question";
    } else {
      location.hash="#/results";
    }
  }

  function wireQuestion(){
    state._qAdvanced=false; startTimer();
    $all(".opt").forEach(function(btn){
      btn.addEventListener("click", function(){
        if (state._qAdvanced) return;
        var ok = btn.getAttribute("data-ok")==="1";
        $all(".opt").forEach(function(b){ b.disabled=true; });
        btn.classList.add(ok?"correct":"wrong");
        var nb=$("#nextBtn"); if (nb) nb.textContent = ok ? t("correct") : t("wrong");
        state._qAdvanced=true;
        if (ok){
          var bonus = Math.ceil(state._remaining/1000)*5;
          state.score += 100 + bonus; state.streak += 1;
        } else { state.streak = 0; }
        setTimeout(nextStep, 700);
      });
    });
    var nb=$("#nextBtn"); if (nb) nb.addEventListener("click", function(){ if(!state._qAdvanced){state.streak=0;state._qAdvanced=true;} nextStep(); });
  }

  function renderResults(){
    var coinsReward = Math.max(0, Math.round(state.score*0.10));
    return wrapPhone(screen(t("resultsTitle"),
      '<div class="card"><strong>'+t("score")+':</strong> '+state.score+'</div>'+
      '<div class="card"><strong>'+t("streak")+':</strong> '+state.streak+'</div>'+
      '<div class="card"><strong>'+t("reward")+':</strong> <span class="coin"></span> '+coinsReward+'</div>'+
      '<div class="row" style="margin-top:12px">'+
        '<a class="btn cta" id="claimBtn" style="flex:1">'+t("again")+'</a>'+
        '<a class="btn" href="#/modes" style="flex:1">'+t("modesTitle")+'</a>'+
      '</div>'
    ));
  }
  function wireResults(){
    var cb=$("#claimBtn");
    if (cb) cb.addEventListener("click", function(){
      var coinsReward = Math.max(0, Math.round(state.score*0.10));
      if (!state._awarded){ state.wallet.coins += coinsReward; saveWallet(); state._awarded = true; }
      state.questionIx=0; state.score=0; state.streak=0; state._qAdvanced=false;
      regenOrder(getQuestions().length);
      location.hash="#/question";
    });
  }

  /* ================== avatar (new Trophy) ================== */
  function previewSVG(){
    var eq = state.equipped || {};
    var cape    = eq.cape    ? '<path d="M22 118 L128 228 L234 118 Q205 132 128 132 Q51 132 22 118" fill="#8b5cf6" opacity="0.55"/>' : '';
    var headband= eq.headband? '<rect x="84" y="72"  width="88" height="14" rx="6" fill="#e11d48" />' : '';
    var visor   = eq.visor   ? '<rect x="88" y="102" width="80" height="12" rx="6" fill="#7c3aed" opacity="0.85"/>' : '';
    var scarf   = eq.scarf   ? '<path d="M86 168 Q128 186 170 168 L170 180 Q128 200 86 180 Z" fill="#14b8a6"/>' : '';
    var charm   = eq.charm   ? '<circle cx="128" cy="194" r="10" fill="#ffd166" stroke="#a66f00" stroke-width="3"/>' : '';

    return (
      '<svg width="140" height="140" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">'+
        '<defs>'+
          '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">'+
            '<stop offset="0" stop-color="#ffe08a"/>'+
            '<stop offset="0.45" stop-color="#ffc93c"/>'+
            '<stop offset="1" stop-color="#ffb000"/>'+
          '</linearGradient>'+
          '<linearGradient id="goldDark" x1="0" y1="0" x2="0" y2="1">'+
            '<stop offset="0" stop-color="#d28a00"/>'+
            '<stop offset="1" stop-color="#a66f00"/>'+
          '</linearGradient>'+
          '<filter id="shine" x="-20%" y="-20%" width="140%" height="140%">'+
            '<feGaussianBlur in="SourceAlpha" stdDeviation="3" result="b"/>'+
            '<feOffset dx="0" dy="1" result="o"/>'+
            '<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>'+
          '</filter>'+
        '</defs>'+
        cape+
        '<g stroke="url(#goldDark)" stroke-width="8" fill="none" filter="url(#shine)">'+
          '<path d="M58 94 q-34 8 -34 36 q0 26 30 34" />'+
          '<path d="M198 94 q34 8 34 36 q0 26 -30 34" />'+
        '</g>'+
        '<g filter="url(#shine)">'+
          '<ellipse cx="128" cy="78" rx="86" ry="26" fill="url(#gold)" stroke="url(#goldDark)" stroke-width="8"/>'+
          '<path d="M42 78 q10 72 64 88 v18 h44 v-18 q54 -16 64 -88 z" fill="url(#gold)" stroke="url(#goldDark)" stroke-width="8"/>'+
          '<rect x="96" y="166" width="64" height="30" rx="6" fill="url(#gold)" stroke="url(#goldDark)" stroke-width="6"/>'+
          '<rect x="64" y="204" width="128" height="28" rx="10" fill="url(#gold)" stroke="url(#goldDark)" stroke-width="6"/>'+
        '</g>'+
        '<ellipse cx="106" cy="118" rx="18" ry="14" fill="#fff" stroke="#2A2F45" stroke-width="3"/>'+
        '<ellipse cx="150" cy="118" rx="18" ry="14" fill="#fff" stroke="#2A2F45" stroke-width="3"/>'+
        '<circle cx="106" cy="118" r="10" fill="#4da3ff"/>'+
        '<circle cx="150" cy="118" r="10" fill="#4da3ff"/>'+
        '<circle cx="106" cy="118" r="5" fill="#1e2a44"/>'+
        '<circle cx="150" cy="118" r="5" fill="#1e2a44"/>'+
        '<circle cx="101" cy="113" r="3" fill="#fff"/>'+
        '<circle cx="145" cy="113" r="3" fill="#fff"/>'+
        '<path d="M98 144 q30 22 60 0" fill="none" stroke="#2A2F45" stroke-width="6" stroke-linecap="round"/>'+
        '<path d="M112 146 q16 12 32 0 q0 14 -16 14 q-16 0 -16 -14 z" fill="#ff6b6b"/>'+
        '<g fill="#fff" stroke="#2A2F45" stroke-width="3">'+
          '<ellipse cx="64"  cy="132" rx="10" ry="8"/>'+
          '<ellipse cx="192" cy="132" rx="10" ry="8"/>'+
        '</g>'+
        headband+visor+scarf+charm+
      '</svg>'
    );
  }

  function renderCustomization(){
    var c=state.content; var ownedMap={}; state.owned.forEach(function(id){ownedMap[id]=1;});
    var char=(c.characters && c.characters[0]) || {name_ar:"كأس",name_en:"Trophy",default:{colorway:"Gold"}};
    var outfits=c.cosmetics||[];
    var equippedBadges = Object.keys(state.equipped).map(function(slot){
      var id=state.equipped[slot]; return id?'<span class="badge">'+slot+': '+id.replace(/_/g," ")+'</span>':'';
    }).filter(Boolean).join(" ") || '<span class="badge">'+t("nothingEquipped")+'</span>';

    function item(o){
      var isOwned=!!ownedMap[o.id]; var isEq=(state.equipped[o.slot]===o.id);
      return '<div class="card store-item" style="width:100%">'+
        '<div><div><strong>'+o.id.replace(/_/g," ")+'</strong> <span class="badge">'+o.slot+'</span></div>'+
        '<div class="price">'+fmtPrice(o.price)+'</div></div>'+
        '<div class="row">'+(
          !isOwned?'<button class="btn cta" data-buy="'+o.id+'">'+t("buy")+'</button>':
          (isEq?'<span class="badge">'+t("owned")+'</span><button class="btn" data-unequip="'+o.slot+'">'+t("unequip")+'</button>':
                 '<span class="badge">'+t("owned")+'</span><button class="btn cta" data-equip="'+o.id+'" data-slot="'+o.slot+'">'+t("equip")+'</button>')
        )+'</div></div>';
    }

    return wrapPhone(screen(t("avatarTitle"),
      '<div class="card avatar" style="width:100%">'+
        '<div class="preview">'+previewSVG()+'</div>'+
        '<div><div><strong>'+((lang==="ar")?char.name_ar:char.name_en)+' — '+(char.default?char.default.colorway:"Gold")+'</strong></div>'+
        '<div class="row" style="margin-top:6px">'+equippedBadges+'</div></div>'+
      '</div>'+
      outfits.map(item).join("")+
      '<div class="row" style="margin-top:12px">'+
        '<div class="kbd" style="flex:1;text-align:center">'+t("coins")+': '+state.wallet.coins+'</div>'+
        '<div class="kbd" style="flex:1;text-align:center)">'+t("gems")+': '+state.wallet.gems+'</div>'+
      '</div>'
    ));
  }
  function wireCustomization(){
    $all("[data-buy]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var id=btn.getAttribute("data-buy");
        var item=(state.content.cosmetics||[]).find(function(x){return x.id===id;})||{};
        var price=item.price||{};
        if (price.coins && state.wallet.coins<price.coins){ alert(t("notEnough")); return; }
        if (price.gems  && state.wallet.gems <price.gems ){ alert(t("notEnough")); return; }
        if (price.coins) state.wallet.coins-=price.coins;
        if (price.gems ) state.wallet.gems -=price.gems;
        state.owned.push(id); saveOwned(); saveWallet(); render();
      });
    });
    $all("[data-equip]").forEach(function(btn){
      btn.addEventListener("click", function(){ state.equipped[btn.getAttribute("data-slot")] = btn.getAttribute("data-equip"); saveEquipped(); render(); });
    });
    $all("[data-unequip]").forEach(function(btn){
      btn.addEventListener("click", function(){ state.equipped[btn.getAttribute("data-unequip")] = null; saveEquipped(); render(); });
    });
  }

  function renderStore(){
    var c=state.content||{store:{daily:[],weekly:[]},cosmetics:[]};
    var owned = new Set(state.owned);
    var items = [].concat(
      (c.store.daily||[]).map(function(id){ return (c.cosmetics||[]).find(function(x){ return x.id===id; }); }),
      (c.store.weekly||[]).map(function(id){ return (c.cosmetics||[]).find(function(x){ return x.id===id; }); })
    ).filter(Boolean);

    function card(o){
      var isOwned=owned.has(o.id);
      var isEq=(state.equipped[o.slot]===o.id);
      var action = !isOwned
        ? '<button class="btn cta" data-store-buy="'+o.id+'">'+t("buy")+'</button>'
        : (!isEq ? '<button class="btn" data-store-equip="'+o.id+'" data-slot="'+o.slot+'">'+t("equip")+'</button>'
                 : '<span class="badge">'+t("owned")+'</span>');
      return (
        '<div class="card store-item" style="width:100%">'+
          '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center">'+
            '<div><strong>'+o.id.replace(/_/g," ")+'</strong><div class="price">'+fmtPrice(o.price)+'</div></div>'+
            '<div>'+action+'</div>'+
          '</div>'+
        '</div>'
      );
    }

    return wrapPhone(
      screen(t("storeTitle"), items.map(card).join("") ) +
      '<div class="row" style="margin-top:12px">'+
        '<div class="kbd" style="flex:1;text-align:center">'+t("coins")+': '+state.wallet.coins+'</div>'+
        '<div class="kbd" style="flex:1;text-align:center">'+t("gems")+': '+state.wallet.gems+'</div>'+
      '</div>'
    );
  }
  function wireStore(){
    $all("[data-store-buy]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var id=btn.getAttribute("data-store-buy");
        var item=(state.content.cosmetics||[]).find(function(x){return x.id===id;})||{};
        var price=item.price||{};
        if (price.coins && state.wallet.coins<price.coins){ alert(t("notEnough")); return; }
        if (price.gems  && state.wallet.gems <price.gems ){ alert(t("notEnough")); return; }
        if (price.coins) state.wallet.coins-=price.coins;
        if (price.gems ) state.wallet.gems -=price.gems;
        state.owned.push(id); saveOwned(); saveWallet(); render();
      });
    });
    $all("[data-store-equip]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var id=btn.getAttribute("data-store-equip");
        var slot=btn.getAttribute("data-slot");
        if (state.owned.indexOf(id)===-1){ alert(t("notEnough")); return; }
        state.equipped[slot]=id; saveEquipped(); render();
      });
    });
  }

  /* ================== render & boot ================== */
  function markActiveTab(){
    var r = state.route || "splash";
    $all("header .tabs a").forEach(function(a){
      var isActive=(a.getAttribute("href")==="#/"+r);
      if(isActive) a.classList.add("active"); else a.classList.remove("active");
    });
  }

  function render(){
    var app = getApp();
    loadContent(function(){
      clearInterval(state._timerId);
      var html="";
      switch(state.route){
        case "splash":    html=renderSplash(); break;
        case "home":      html=renderHome(); break;
        case "modes":     html=renderModes(); break;
        case "lobby":     html=renderLobby(); break;
        case "question":  html=renderQuestion(); break;
        case "results":   html=renderResults(); break;
        case "customization": html=renderCustomization(); break;
        case "store":     html=renderStore(); break;
        default:          html=renderSplash();
      }
      app.innerHTML=html;

      // اربط الأحداث حسب الصفحة
      switch(state.route){
        case "modes":        wireModes(); break;
        case "lobby":        wireLobby(); break;
        case "question":     wireQuestion(); break;
        case "results":      wireResults(); break;
        case "customization":wireCustomization(); break;
        case "store":        wireStore(); break;
      }
      if (typeof markActiveTab==="function") markActiveTab();
    });
  }

  function boot(){
    var bl=$("#btnLang");  if(bl) bl.addEventListener("click", function(){ setLang(lang==="ar"?"en":"ar"); });
    var bt=$("#btnTheme"); if(bt) bt.addEventListener("click", function(){ setTheme(theme==="dark"?"light":"dark"); });
    setLang(lang); setTheme(theme);
    if(!location.hash) location.hash="#/splash";
    render();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
