/* Roundo v16 — Questions ONLY from content.json + Filters + Dynamic Q-Bank + Full-digit HINT */
(function () {
  'use strict';

  // ===== i18n =====
  var STR = {
    ar:{app:"راوندو",badge:"نموذج",home:"الرئيسية",modes:"إعداد المباراة",lobby:"اللوبي",store:"المتجر",
        splashTitle:"الشاشة الافتتاحية",quickPlay:"مباراة سريعة",playNow:"ابدأ الآن",
        storeTitle:"المتجر",avatarTitle:"شخصيتي",questionTitle:"السؤال",resultsTitle:"النتائج",
        abilities:"القدرات",traps:"الفخاخ",progress:"التقدم",
        owned:"مملوك",buy:"شراء",equip:"تجهيز",unequip:"إزالة",coins:"عملة",gems:"جوهرة",
        free:"مجاني",inProgress:"قريبًا",notEnough:"لا توجد عملات كافية",
        correct:"إجابة صحيحة!",wrong:"إجابة خاطئة",next:"التالي",again:"العب مجددًا",
        nothingEquipped:"لا شيء مجهّز", players:"اللاعبون", rotate:"فضلاً استخدم وضع الطول",
        score:"النقاط", streak:"سلسلة", reward:"المكافأة",
        startMatch:"ابدأ المباراة", timePerQ:"الوقت لكل سؤال", powerups:"القدرات", on:"تشغيل", off:"إيقاف",
        mode:"النمط", you:"أنت",
        category:"التصنيف", difficulty:"الصعوبة", rounds:"عدد الجولات", all:"الكل",
        hint:"Hint (إخفاء الأرقام)", skip:"تخطي",
        noQuestions:"لا توجد أسئلة مطابقة للإعدادات. راجع content.json أو خفِّف الفلاتر.",
        loadedCount:"تم تحميل عدد الأسئلة: "},
    en:{app:"Roundo",badge:"Prototype",home:"Home",modes:"Match Setup",lobby:"Lobby",store:"Store",
        splashTitle:"Splash",quickPlay:"Quick Play",playNow:"Play Now",
        storeTitle:"Store",avatarTitle:"My Avatar",questionTitle:"Question",resultsTitle:"Results",
        abilities:"Abilities",traps:"Traps",progress:"Progress",
        owned:"Owned",buy:"Buy",equip:"Equip",unequip:"Unequip",coins:"Coin",gems:"Gem",
        free:"Free",inProgress:"Coming soon",notEnough:"Not enough coins",
        correct:"Correct!",wrong:"Wrong",next:"Next",again:"Play Again",
        nothingEquipped:"Nothing equipped", players:"Players", rotate:"Please use portrait",
        score:"Score", streak:"Streak", reward:"Reward",
        startMatch:"Start Match", timePerQ:"Time per question", powerups:"Power-ups", on:"On", off:"Off",
        mode:"Mode", you:"You",
        category:"Category", difficulty:"Difficulty", rounds:"Rounds", all:"All",
        hint:"Hint (hide digits)", skip:"Skip",
        noQuestions:"No questions match your filters. Check content.json or relax filters.",
        loadedCount:"Loaded questions: "}
  };

  // ===== helpers =====
  function $(s, r){ return (r||document).querySelector(s); }
  function $all(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
  function t(k){ return (STR[lang] && STR[lang][k]) || k; }
  function safeText(id, txt){ var el = $("#"+id); if (el) el.textContent = txt; }
  function shuffle(a){ for (var i=a.length-1; i>0; i--){ var j = Math.floor(Math.random()*(i+1)); var tmp=a[i]; a[i]=a[j]; a[j]=tmp; } return a; }
  function maskDigits(str){ if (!str) return str; return String(str).replace(/[0-9٠-٩]+/g, function(m){ return Array(m.length+1).join('—'); }); }

  // ===== state =====
  var urlLang = (new URLSearchParams(location.search)).get("lang");
  var lang  = urlLang || localStorage.getItem("roundo_lang")  || "ar";
  var theme = localStorage.getItem("roundo_theme") || "dark";
  var savedSettings = JSON.parse(localStorage.getItem("roundo_settings") || '{"category":"all","difficulty":"all","rounds":10}');

  var state = {
    route: (location.hash.replace("#/","") || "splash"),
    wallet:   JSON.parse(localStorage.getItem("roundo_wallet")   || '{"coins":2000,"gems":150}'),
    owned:    JSON.parse(localStorage.getItem("roundo_owned")    || "[]"),
    equipped: JSON.parse(localStorage.getItem("roundo_equipped") || '{"headband":null,"scarf":null,"visor":null,"cape":null,"charm":null}'),

    content: null,         // يُحمّل من content.json فقط
    questions: [],         // نسخة مُطبّعة من content.json.questions

    // إعدادات
    settings: { category: savedSettings.category, difficulty: savedSettings.difficulty, rounds: savedSettings.rounds },
    currentMode: "quick",
    lobby:{players:2, timeMs:20000, powerups:true},

    // لعب
    qSet: [],            // فهارس الأسئلة المختارة
    questionIx: 0, score: 0, streak: 0, _awarded:false,
    _qAdvanced:false, _timerId:null, _remaining:20000,
    _isNewQuestion:true, hintMaskOn:false
  };

  function persistSettings(){ localStorage.setItem("roundo_settings", JSON.stringify(state.settings)); }
  function saveOwned(){  localStorage.setItem("roundo_owned", JSON.stringify(state.owned)); }
  function saveWallet(){ localStorage.setItem("roundo_wallet", JSON.stringify(state.wallet)); }
  function saveEquipped(){ localStorage.setItem("roundo_equipped", JSON.stringify(state.equipped)); }
  function fmtPrice(p){ return !p ? t("free") : (p.coins ? (p.coins + " " + t("coins")) : (p.gems + " " + t("gems"))); }

  // mount #app if missing
  function getApp(){
    var app = $("#app");
    if (!app){
      app = document.createElement("main"); app.id = "app";
      var header = $("header") || document.body;
      header.parentNode.insertBefore(app, header.nextSibling);
    }
    return app;
  }

  // ===== route =====
  window.addEventListener("hashchange", function(){ state.route = location.hash.replace("#/","") || "splash"; render(); });

  // ===== lang/theme =====
  function setLang(l){
    lang=l; localStorage.setItem("roundo_lang", l);
    document.documentElement.lang=l; document.documentElement.dir=(l==="ar"?"rtl":"ltr");
    safeText("t_app", t("app")); safeText("t_badge", STR[lang].badge);
    safeText("t_home", t("home")); safeText("t_modes", t("modes"));
    safeText("t_lobby", t("lobby")); safeText("t_store", t("store"));
    var bl=$("#btnLang"); if (bl) bl.textContent=(l==="ar"?"EN":"AR");
    render();
  }
  function setTheme(m){
    theme=m; localStorage.setItem("roundo_theme",m);
    if (theme==="light") document.body.classList.add("theme-light");
    else document.body.classList.remove("theme-light");
  }

  // ===== content loading (ONLY from content.json) =====
  function normalizeQuestions(list){
    var out = [];
    (list||[]).forEach(function(q){
      try{
        if (!q || !q.ar || !q.en || !q.ar.prompt || !q.en.prompt) return;
        var arAns = (q.ar.answers||[]).filter(function(a){ return a && typeof a.text==="string"; });
        var enAns = (q.en.answers||[]).filter(function(a){ return a && typeof a.text==="string"; });
        if (arAns.length!==4 || enAns.length!==4) return;
        var okAr = arAns.some(function(a){return !!a.correct;});
        var okEn = enAns.some(function(a){return !!a.correct;});
        if (!okAr || !okEn) return;
        out.push({
          category: q.category || "general",
          difficulty: q.difficulty || "easy",
          ar:{ prompt:String(q.ar.prompt), answers: arAns.map(function(a){ return {text:String(a.text), correct:!!a.correct}; }) },
          en:{ prompt:String(q.en.prompt), answers: enAns.map(function(a){ return {text:String(a.text), correct:!!a.correct}; }) }
        });
      }catch(_e){}
    });
    return out;
  }

  function loadContent(cb){
    if (state.content){ if(cb) cb(); return; }
    fetch("content.json", {cache:"no-store"})
      .then(function(r){ if(!r.ok) throw new Error("fetch failed"); return r.json(); })
      .then(function(json){
        state.content = json || {};
        state.questions = normalizeQuestions(json.questions);
        console.info((lang==="ar"?STR.ar.loadedCount:STR.en.loadedCount), state.questions.length);
        if(cb) cb();
      })
      .catch(function(err){
        console.error("Failed to load content.json", err);
        state.content = {characters:[{name_ar:"تروفي",name_en:"Trophy",default:{colorway:"Gold"}}], cosmetics:[], store:{daily:[],weekly:[]}};
        state.questions = []; // لا نضع أسئلة داخلية أبداً
        if(cb) cb();
      });
  }

  // ===== layout =====
  function wrapPhone(inner){ return '<div style="width:min(420px,94vw);margin:12px auto;display:flex;flex-direction:column;gap:12px">'+inner+'</div>'; }
  function screen(title, body){ return '<section class="card" style="width:100%"><div class="h1">'+title+'</div>'+body+'</section>'; }

  // ===== pages =====
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

  function uniqueValues(arr, key){
    var seen = {}; var res = [];
    arr.forEach(function(o){ var v=o[key]||"unknown"; if(!seen[v]){ seen[v]=1; res.push(v); } });
    return res;
  }

  function renderModes(){
    var qs = state.questions;
    var cats = ["all"].concat(uniqueValues(qs, "category").filter(function(x){return x!=="all";}));
    var diffs = ["all"].concat(uniqueValues(qs, "difficulty").filter(function(x){return x!=="all";}));
    function opt(list, val){ return list.map(function(v){ return '<option value="'+v+'" '+(state.settings[val]===v?'selected':'')+'>'+ (v==="all"?t("all"):v) +'</option>'; }).join(""); }
    var roundsOpts=[5,6,8,10,12,15,20].map(function(n){ return '<option value="'+n+'" '+(state.settings.rounds===n?'selected':'')+'>'+n+'</option>'; }).join("");

    var body =
      '<div class="card">'+
        '<div class="kbd" style="margin-bottom:6px">'+t("loadedCount")+ (qs.length||0) +'</div>'+
        '<label class="kbd" style="display:block;margin-bottom:8px">'+t("category")+
          '<select id="selCat" style="width:100%;margin-top:4px">'+ opt(cats,"category") +'</select>'+
        '</label>'+
        '<label class="kbd" style="display:block;margin-bottom:8px">'+t("difficulty")+
          '<select id="selDiff" style="width:100%;margin-top:4px">'+ opt(diffs,"difficulty") +'</select>'+
        '</label>'+
        '<label class="kbd" style="display:block;margin-bottom:8px">'+t("rounds")+
          '<select id="selRounds" style="width:100%;margin-top:4px">'+ roundsOpts +'</select>'+
        '</label>'+
        '<div class="row" style="justify-content:space-between;margin-top:8px">'+
          '<a class="btn" href="#/customization">'+t("avatarTitle")+'</a>'+
          '<a class="btn" href="#/store">'+t("storeTitle")+'</a>'+
        '</div>'+
      '</div>'+
      '<button class="btn cta" id="toLobby" style="width:100%">'+t("playNow")+'</button>';

    return wrapPhone(screen(t("modesTitle"), body));
  }
  function wireModes(){
    var sc=$("#selCat"); if(sc) sc.addEventListener("change", function(e){ state.settings.category=e.target.value; persistSettings(); });
    var sd=$("#selDiff"); if(sd) sd.addEventListener("change", function(e){ state.settings.difficulty=e.target.value; persistSettings(); });
    var sr=$("#selRounds"); if(sr) sr.addEventListener("change", function(e){ state.settings.rounds=parseInt(e.target.value,10); persistSettings(); });
    var go=$("#toLobby"); if(go) go.addEventListener("click", function(){ location.hash="#/lobby"; });
  }

  function renderLobby(){
    return wrapPhone(screen(t("lobbyTitle"),
      '<div class="card">'+
        '<div class="row" style="justify-content:space-between">'+
          '<div><span class="badge">'+t("category")+'</span> <strong>'+ (state.settings.category==="all"?t("all"):state.settings.category) +'</strong></div>'+
          '<div><span class="badge">'+t("difficulty")+'</span> <strong>'+ (state.settings.difficulty==="all"?t("all"):state.settings.difficulty) +'</strong></div>'+
        '</div>'+
        '<div class="row" style="margin-top:8px;gap:8px">'+
          '<label class="kbd" style="flex:1">'+t("rounds")+': '+
            '<select id="selRounds2" style="width:100%;margin-top:4px">'+
              [5,6,8,10,12,15,20].map(function(n){return '<option value="'+n+'" '+(state.settings.rounds===n?'selected':'')+'>'+n+'</option>';}).join("")+
            '</select>'+
          '</label>'+
          '<label class="kbd" style="flex:1">'+t("timePerQ")+
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
    var sr2=$("#selRounds2"); if (sr2) sr2.addEventListener("change", function(e){ state.settings.rounds=parseInt(e.target.value,10); persistSettings(); });
    var st=$("#selTime");    if (st)  st.addEventListener("change",  function(e){ state.lobby.timeMs=parseInt(e.target.value,10); });
    var bp=$("#btnPower");   if (bp)  bp.addEventListener("click",   function(){ state.lobby.powerups=!state.lobby.powerups; render(); });
    var bs=$("#btnStart");   if (bs)  bs.addEventListener("click",   startMatch);
  }

  // ===== Build question bank according to filters =====
  function buildQSet(){
    var all = state.questions || [];
    if (!all.length){ state.qSet=[]; return; }
    var pool = all.filter(function(q){
      var okCat = (state.settings.category==="all") || (q.category===state.settings.category);
      var okDiff= (state.settings.difficulty==="all") || (q.difficulty===state.settings.difficulty);
      return okCat && okDiff;
    });
    if (!pool.length){ pool = all.slice(); } // fallback: لا تطابق—نستخدم الكل
    shuffle(pool);
    var rounds = Math.max(1, Math.min(state.settings.rounds||6, pool.length));
    var indices = [];
    for (var i=0;i<rounds;i++){
      var q = pool[i];
      var ix = all.indexOf(q);
      if (ix>=0) indices.push(ix);
    }
    state.qSet = indices;
  }

  function startMatch(){
    state.currentMode = "quick";
    state.questionIx=0; state.score=0; state.streak=0; state._awarded=false;
    state._isNewQuestion = true; state.hintMaskOn=false;
    buildQSet();
    location.hash="#/question";
  }

  // ===== Gameplay =====
  function mmss(ms){ var s=Math.max(0,Math.ceil(ms/1000)); return Math.floor(s/60)+":"+("0"+(s%60)).slice(-2); }

  function getCurrentQuestion(){
    var idx = state.qSet[state.questionIx];
    var q = (state.questions || [])[idx] || null;
    return q;
  }

  function renderQuestion(){
    if (!state.qSet.length){
      return wrapPhone(screen(t("questionTitle"),
        '<div class="card">'+t("noQuestions")+' <div style="margin-top:8px"><a class="btn" href="#/modes">'+t("modes")+'</a></div></div>'
      ));
    }
    var q = getCurrentQuestion();
    if (!q){
      return wrapPhone(screen(t("questionTitle"), '<div class="card">—</div>'));
    }
    var prompt = (lang==="ar") ? q.ar.prompt : q.en.prompt;
    var answers = (lang==="ar") ? q.ar.answers : q.en.answers;

    if (state.hintMaskOn){
      prompt = maskDigits(prompt);
      answers = answers.map(function(a){ return { text: maskDigits(a.text), correct: !!a.correct }; });
    }

    var opts = shuffle(answers.slice()).map(function(a,i){
      return { txt:a.text, ok:!!a.correct, i:i };
    });

    var topRow =
      '<div class="row" style="justify-content:space-between;margin-bottom:8px">'+
        '<span class="kbd">'+t("score")+': '+state.score+'</span>'+
        '<span class="kbd">'+t("streak")+': '+state.streak+'</span>'+
      '</div>';

    var actionsRow =
      '<div class="row" style="margin-top:8px;justify-content:space-between;gap:8px">'+
        '<button class="btn" id="btnHint">'+t("hint")+'</button>'+
        '<a class="btn" href="#/lobby">⟵ '+t("lobby")+'</a>'+
        '<button class="btn" id="nextBtn">'+t("skip")+'</button>'+
      '</div>';

    return wrapPhone(screen(t("questionTitle"),
      topRow+
      '<div class="h2" style="margin-bottom:8px">'+prompt+'</div>'+
      '<div style="display:flex;flex-direction:column;gap:8px">'+
        opts.map(function(o){ return '<button class="opt btn" style="width:100%;text-align:start" data-ok="'+(o.ok?'1':'0')+'">'+o.txt+'</button>'; }).join("")+
      '</div>'+
      '<div class="meta" style="margin-top:10px">'+
        '<span class="badge">Round '+(state.questionIx+1)+'/'+(state.qSet.length||0)+'</span>'+
        '<span class="badge" id="timer">'+mmss(state._remaining)+'</span>'+
      '</div>'+
      actionsRow
    ));
  }

  function startTimer(){
    clearInterval(state._timerId);
    if (state._isNewQuestion) state._remaining = state.lobby.timeMs;
    state._isNewQuestion = false;

    state._timerId = setInterval(function(){
      if (state._qAdvanced) { clearInterval(state._timerId); return; }
      state._remaining -= 100;
      var timerEl = $("#timer");
      if (timerEl) timerEl.textContent = mmss(state._remaining);
      if (state._remaining <= 0){
        clearInterval(state._timerId);
        state.streak = 0; state._qAdvanced = true;
        setTimeout(nextStep, 10);
      }
    }, 100);
  }

  function nextStep(){
    if (state.questionIx < state.qSet.length - 1) {
      state.questionIx++;
      state._isNewQuestion = true;
      state.hintMaskOn = false;
      if (state.route === "question") render();
      else location.hash = "#/question";
    } else {
      location.hash = "#/results";
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

    var hb=$("#btnHint");
    if (hb) hb.addEventListener("click", function(){
      if (state._qAdvanced || state.hintMaskOn) return;
      state.hintMaskOn = true;
      var prevNew = state._isNewQuestion;
      state._isNewQuestion = false;
      render();
      state._isNewQuestion = prevNew;
    });

    var nb=$("#nextBtn");
    if (nb) nb.addEventListener("click", function(){
      if (!state._qAdvanced){ state.streak=0; state._qAdvanced=true; }
      nextStep();
    });
  }

  function renderResults(){
    var coinsReward = Math.max(0, Math.round(state.score*0.10));
    return wrapPhone(screen(t("resultsTitle"),
      '<div class="card"><strong>'+t("score")+':</strong> '+state.score+'</div>'+
      '<div class="card"><strong>'+t("streak")+':</strong> '+state.streak+'</div>'+
      '<div class="card"><strong>'+t("reward")+':</strong> <span class="coin"></span> '+coinsReward+'</div>'+
      '<div class="row" style="margin-top:12px">'+
        '<a class="btn cta" id="claimBtn" style="flex:1">'+t("again")+'</a>'+
        '<a class="btn" href="#/modes" style="flex:1">'+t("modes")+'</a>'+
      '</div>'
    ));
  }
  function wireResults(){
    var cb=$("#claimBtn");
    if (cb) cb.addEventListener("click", function(){
      var coinsReward = Math.max(0, Math.round(state.score*0.10));
      if (!state._awarded){ state.wallet.coins += coinsReward; saveWallet(); state._awarded = true; }
      startMatch();
    });
  }

  // ===== Avatar / Store =====
  function previewSVG(){
    var eq=state.equipped;
    var cape=eq.cape?'<path d="M30 110 L128 210 L226 110 Q200 120 128 120 Q56 120 30 110" fill="#8b5cf6" opacity="0.55"/>':'';
    var headband=eq.headband?'<rect x="88" y="88" width="80" height="12" rx="5" fill="#e11d48"/>':'';
    var visor=eq.visor?'<rect x="92" y="120" width="72" height="10" rx="4" fill="#7c3aed" opacity="0.85"/>':'';
    var scarf=eq.scarf?'<path d="M90 154 Q128 170 166 154 L166 164 Q128 182 90 164 Z" fill="#14b8a6"/>':'';
    var charm=eq.charm?'<circle cx="128" cy="178" r="10" fill="#ffd166" stroke="#a66f00" stroke-width="3"/>':'';
    return '<svg width="120" height="120" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">'+
      '<defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#ffb000"/></linearGradient></defs>'+
      cape+
      '<path d="M48 96 h160 l-16 64 H64 Z" fill="url(#g2)" stroke="#a66f00" stroke-width="8"/>'+
      '<path d="M40 88 q-28 6 -28 36 q0 28 28 36" fill="none" stroke="#ffb000" stroke-width="12" stroke-linecap="round"/>'+
      '<path d="M216 88 q28 6 28 36 q0 28 -28 36" fill="none" stroke="#ffb000" stroke-width="12" stroke-linecap="round"/>'+
      headband+
      '<ellipse cx="104" cy="132" rx="16" ry="12" fill="#fff" stroke="#2A2F45" stroke-width="3"/>'+
      '<ellipse cx="152" cy="132" rx="16" ry="12" fill="#fff" stroke="#2A2F45" stroke-width="3"/>'+
      '<circle cx="104" cy="132" r="6" fill="#2A2F45"/><circle cx="152" cy="132" r="6" fill="#2A2F45"/>'+
      visor+
      '<path d="M96 152 q32 18 64 0" fill="none" stroke="#2A2F45" stroke-width="5" stroke-linecap="round"/>'+
      scarf+
      '<rect x="96" y="160" width="64" height="36" rx="6" fill="url(#g2)" stroke="#a66f00" stroke-width="6"/>'+
      charm+
      '<rect x="64" y="200" width="128" height="28" rx="10" fill="url(#g2)" stroke="#a66f00" stroke-width="6"/>'+
    '</svg>';
  }

  function renderCustomization(){
    var c=state.content || {characters:[{name_ar:"",name_en:"",default:{colorway:""}}], cosmetics:[]};
    var ownedMap={}; state.owned.forEach(function(id){ownedMap[id]=1;});
    var char=c.characters[0] || {name_ar:"",name_en:"",default:{colorway:""}};
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
        '<div><div><strong>'+((lang==="ar")?char.name_ar:char.name_en)+' — '+(char.default?char.default.colorway:"")+'</strong></div>'+
        '<div class="row" style="margin-top:6px">'+equippedBadges+'</div></div>'+
      '</div>'+
      (outfits.map(item).join("") || '<div class="card">'+t("storeTitle")+'</div>')+
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
        var item=((state.content&&state.content.cosmetics)||[]).find(function(x){return x.id===id;}) || {};
        var price=item.price || {};
        if (price.coins && state.wallet.coins<price.coins) { alert(t("notEnough")); return; }
        if (price.gems  && state.wallet.gems <price.gems ) { alert(t("notEnough")); return; }
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
    var c = state.content || {cosmetics:[], store:{daily:[], weekly:[]}};
    var owned = new Set(state.owned);

    var items = [].concat(
      (c.store.daily||[]).map(function(id){ return (c.cosmetics||[]).find(function(x){ return x.id===id; }); }),
      (c.store.weekly||[]).map(function(id){ return (c.cosmetics||[]).find(function(x){ return x.id===id; }); })
    ).filter(Boolean);

    function card(o){
      var isOwned = owned.has(o.id);
      var isEq = (state.equipped[o.slot] === o.id);
      var action = "";
      if (!isOwned){
        action = '<button class="btn cta" data-store-buy="'+o.id+'">'+t("buy")+'</button>';
      } else if (!isEq){
        action = '<button class="btn" data-store-equip="'+o.id+'" data-slot="'+o.slot+'">'+t("equip")+'</button>';
      } else {
        action = '<span class="badge">'+t("owned")+'</span>';
      }
      return (
        '<div class="card store-item" style="width:100%">'+
          '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center">'+
            '<div><strong>'+o.id.replace(/_/g," ")+'</strong><div class="price">'+fmtPrice(o.price)+'</div></div>'+
            '<div>'+action+'</div>'+
          '</div>'+
        '</div>'
      );
    }

    var footer =
      '<div class="row" style="margin-top:12px">'+
        '<div class="kbd" style="flex:1;text-align:center">'+t("coins")+': '+state.wallet.coins+'</div>'+
        '<div class="kbd" style="flex:1;text-align:center)">'+t("gems")+': '+state.wallet.gems+'</div>'+
      '</div>';

    return wrapPhone(screen(t("storeTitle"), (items.map(card).join("")||'<div class="card">—</div>') ) + footer);
  }
  function wireStore(){
    $all("[data-store-buy]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var id = btn.getAttribute("data-store-buy");
        var item = ((state.content&&state.content.cosmetics)||[]).find(function(x){ return x.id===id; }) || {};
        var price = item.price || {};
        if (price.coins && state.wallet.coins < price.coins){ alert(t("notEnough")); return; }
        if (price.gems  && state.wallet.gems  < price.gems ){ alert(t("notEnough")); return; }
        if (price.coins) state.wallet.coins -= price.coins;
        if (price.gems ) state.wallet.gems  -= price.gems;
        state.owned.push(id); saveOwned(); saveWallet(); render();
      });
    });
    $all("[data-store-equip]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var id = btn.getAttribute("data-store-equip");
        var slot = btn.getAttribute("data-slot");
        if (state.owned.indexOf(id) === -1){ alert(t("notEnough")); return; }
        state.equipped[slot] = id; saveEquipped(); render();
      });
    });
  }

  // ===== render switch =====
  function markActiveTab(){
    var r = state.route || "splash";
    $all("header .tabs a").forEach(function(a){
      var isActive = (a.getAttribute("href") === "#/"+r);
      if (isActive) a.classList.add("active");
      else a.classList.remove("active");
    });
  }

  function render(){
    var app = getApp();
    loadContent(function(){
      clearInterval(state._timerId);
      var html="";
      switch(state.route){
        case "splash":    html = renderSplash();        break;
        case "home":      html = renderModes();         break; // اختصاراً
        case "modes":     html = renderModes();         break;
        case "lobby":     html = renderLobby();         break;
        case "question":  html = renderQuestion();      break;
        case "results":   html = renderResults();       break;
        case "customization": html = renderCustomization(); break;
        case "store":     html = renderStore();         break;
        default:          html = renderSplash();
      }
      app.innerHTML = html;
      if (typeof markActiveTab === "function") markActiveTab();
      switch(state.route){
        case "modes":        wireModes();         break;
        case "lobby":        wireLobby();         break;
        case "question":     wireQuestion();      break;
        case "results":      wireResults();       break;
        case "customization":wireCustomization(); break;
        case "store":        wireStore();         break;
      }
    });
  }

  // ===== boot =====
  function boot(){
    var bl=$("#btnLang");  if (bl) bl.addEventListener("click", function(){ setLang(lang==="ar"?"en":"ar"); });
    var bt=$("#btnTheme"); if (bt) bt.addEventListener("click", function(){ setTheme(theme==="dark"?"light":"dark"); });
    setLang(lang); setTheme(theme);
    if (!location.hash) location.hash="#/splash";
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

})();
