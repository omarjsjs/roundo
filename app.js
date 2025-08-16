/* Roundo v19 – Hint hides whole option + content.json cache-bust + categories/difficulty ready */
(function () {
  'use strict';

  // ===== i18n =====
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
        mode:"النمط", you:"أنت",
        category:"التصنيف", difficulty:"الصعوبة", any:"الكل",
        hint:"Hint", freeze:"Freeze", shield:"Shield",
        sound:"الصوت", reset:"إعادة ضبط", confirmBuy:"تأكيد الشراء", needOwn:"اشتري العنصر أولًا"},
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
        mode:"Mode", you:"You",
        category:"Category", difficulty:"Difficulty", any:"Any",
        hint:"Hint", freeze:"Freeze", shield:"Shield",
        sound:"Sound", reset:"Reset", confirmBuy:"Confirm purchase", needOwn:"Please buy this first"}
  };

  // ===== helpers =====
  function $(s, r){ return (r||document).querySelector(s); }
  function $all(s, r){ return Array.prototype.slice.call((r||document).querySelectorAll(s)); }
  function t(k){ return (STR[lang] && STR[lang][k]) || k; }
  function safeText(id, txt){ var el = $("#"+id); if (el) el.textContent = txt; }
  function shuffle(a){ for (var i=a.length-1; i>0; i--){ var j = Math.floor(Math.random()*(i+1)); var tmp=a[i]; a[i]=a[j]; a[j]=tmp; } return a; }
  function mmss(ms){ var s=Math.max(0,Math.ceil(ms/1000)); return Math.floor(s/60)+":"+("0"+(s%60)).slice(-2); }
  function uniq(arr){ var m={},out=[]; for(var i=0;i<arr.length;i++){var v=arr[i]; if(v==null) continue; var k=String(v).toLowerCase(); if(!m[k]){m[k]=1; out.push(v);} } return out; }

  // ===== state =====
  var urlLang = (new URLSearchParams(location.search)).get("lang");
  var lang  = urlLang || localStorage.getItem("roundo_lang")  || "ar";
  var theme = localStorage.getItem("roundo_theme") || "dark";
  var settings = JSON.parse(localStorage.getItem("roundo_settings") || '{"sound":true}');

  var COSTS = { hint:30, freeze:40, shield:50 };

  var state = {
    route: (location.hash.replace("#/","") || "splash"),
    wallet:   JSON.parse(localStorage.getItem("roundo_wallet")   || '{"coins":2000,"gems":150}'),
    owned:    JSON.parse(localStorage.getItem("roundo_owned")    || "[]"),
    equipped: JSON.parse(localStorage.getItem("roundo_equipped") || '{"headband":null,"scarf":null,"visor":null,"cape":null,"charm":null}'),
    content: null,
    currentMode: null,
    filters:{ category:"any", difficulty:"any" },
    questionIx: 0, score: 0, streak: 0, _awarded:false,
    _qAdvanced:false, _timerId:null, _remaining:20000,
    _frozen:false, _shieldActive:false,
    lobby:{players:2, timeMs:20000, powerups:true}
  };
  function saveOwned(){  localStorage.setItem("roundo_owned", JSON.stringify(state.owned)); }
  function saveWallet(){ localStorage.setItem("roundo_wallet", JSON.stringify(state.wallet)); }
  function saveEquipped(){ localStorage.setItem("roundo_equipped", JSON.stringify(state.equipped)); }
  function saveSettings(){ localStorage.setItem("roundo_settings", JSON.stringify(settings)); }
  function fmtPrice(p){ return !p ? t("free") : (p.coins ? (p.coins + " " + t("coins")) : (p.gems + " " + t("gems"))); }

  // ===== sounds =====
  var AC = (window.AudioContext || window.webkitAudioContext) ? new (window.AudioContext||window.webkitAudioContext)() : null;
  function beep(freq, dur){
    if (!AC || !settings.sound) return;
    var o=AC.createOscillator(), g=AC.createGain();
    o.type="sine"; o.frequency.value=freq; g.gain.value=0.001; o.connect(g); g.connect(AC.destination);
    var now=AC.currentTime; g.gain.exponentialRampToValueAtTime(0.2, now+0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur/1000);
    o.start(); o.stop(now + dur/1000);
  }
  function snd(type){ if(type==="ok") beep(880,180); else if(type==="bad") beep(220,220); }

  // ===== mount #app if missing =====
  function getApp(){
    var app = $("#app");
    if (!app){
      app = document.createElement("main"); app.id = "app";
      var header = $("header") || document.body; header.parentNode.insertBefore(app, header.nextSibling);
    }
    return app;
  }

  // ===== routing =====
  function setRouteFromHash(){ state.route = (location.hash.replace("#/","") || "splash"); render(); }
  window.addEventListener("hashchange", setRouteFromHash);
  document.addEventListener("click", function(e){
    var a = e.target && e.target.closest && e.target.closest('a[href^="#/"]');
    if (!a) return; e.preventDefault();
    var r = a.getAttribute("href").slice(2) || "splash";
    if (r !== state.route) location.hash = "#/"+r; else render();
  });

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

  // ===== Questions data =====
  var ALL_QUESTIONS = [
    {id:1,prompt_ar:"ما عاصمة فرنسا؟",prompt_en:"What is the capital of France?",
      answers:[{ar:"باريس",en:"Paris",correct:true},{ar:"روما",en:"Rome"},{ar:"مدريد",en:"Madrid"},{ar:"برلين",en:"Berlin"}], category:"general", difficulty:"easy"},
    {id:2,prompt_ar:"٢ + ٢ = ؟",prompt_en:"2 + 2 = ?",
      answers:[{ar:"٣",en:"3"},{ar:"٤",en:"4",correct:true},{ar:"٥",en:"5"},{ar:"٦",en:"6"}], category:"math", difficulty:"easy"},
    {id:3,prompt_ar:"ما لون السماء الصافي عادةً؟",prompt_en:"What color is a clear sky?",
      answers:[{ar:"أحمر",en:"Red"},{ar:"أزرق",en:"Blue",correct:true},{ar:"أخضر",en:"Green"},{ar:"أصفر",en:"Yellow"}], category:"science", difficulty:"easy"},
    {id:4,prompt_ar:"أكبر كوكب في مجموعتنا الشمسية هو؟",prompt_en:"The largest planet in our solar system is?",
      answers:[{ar:"المشتري",en:"Jupiter",correct:true},{ar:"زحل",en:"Saturn"},{ar:"الأرض",en:"Earth"},{ar:"المريخ",en:"Mars"}], category:"science", difficulty:"easy"},
    {id:5,prompt_ar:"لغة تنسيق صفحات الويب هي؟",prompt_en:"The language used to style webpages is?",
      answers:[{ar:"HTML",en:"HTML"},{ar:"CSS",en:"CSS",correct:true},{ar:"SQL",en:"SQL"},{ar:"C++",en:"C++"}], category:"web", difficulty:"easy"},
    {id:6,prompt_ar:"عملة الإمارات العربية المتحدة؟",prompt_en:"The currency of the UAE?",
      answers:[{ar:"اليورو",en:"Euro"},{ar:"الدرهم",en:"Dirham",correct:true},{ar:"الدولار",en:"Dollar"},{ar:"الريال",en:"Riyal"}], category:"uae", difficulty:"easy"}
  ];
  var QUESTIONS = ALL_QUESTIONS.slice();
  var Q_ORDER = shuffle(Array(QUESTIONS.length).fill(0).map(function(_,i){return i;}));

  // تحويل أسئلة content.json إلى نفس البنية
  function applyContentQuestions(json){
    if (!json || !json.questions || !json.questions.length) return;
    var out = [];
    for (var i=0;i<json.questions.length;i++){
      var q=json.questions[i];
      if (!q.ar || !q.en) continue;
      var answers = [];
      var N = Math.max((q.ar.answers||[]).length, (q.en.answers||[]).length);
      for (var j=0;j<N;j++){
        var a_ar = (q.ar.answers||[])[j] || {};
        var a_en = (q.en.answers||[])[j] || {};
        answers.push({ ar:a_ar.text||"", en:a_en.text||"", correct: !!(a_ar.correct||a_en.correct) });
      }
      out.push({
        id: q.id || (i+1),
        prompt_ar: q.ar.prompt || "",
        prompt_en: q.en.prompt || "",
        answers: answers,
        category: q.category || "general",
        difficulty: q.difficulty || "easy"
      });
    }
    if (out.length) {
      ALL_QUESTIONS.length = 0;
      Array.prototype.push.apply(ALL_QUESTIONS, out);
      QUESTIONS = ALL_QUESTIONS.slice();
      Q_ORDER = shuffle(Array(QUESTIONS.length).fill(0).map(function(_,i){return i;}));
    }
  }

  // ===== content (مع كسر كاش حسب v= في URL) =====
  function loadContent(cb){
    if (state.content){ if(cb) cb(); return; }
    var v = (new URLSearchParams(location.search)).get("v") || Date.now();
    fetch("content.json?v="+encodeURIComponent(v), {cache:"no-store"})
      .then(function(r){ if(!r.ok) throw new Error(); return r.json(); })
      .then(function(json){
        state.content = json;
        try { applyContentQuestions(json); } catch(e){}
        if(cb) cb();
      })
      .catch(function(){
        state.content = {
          characters:[{name_ar:"تروفي",name_en:"Trophy",default:{colorway:"Gold"}}],
          cosmetics:[
            {id:"headband_red",slot:"headband",price:{coins:200}},
            {id:"scarf_teal",slot:"scarf",price:{coins:180}},
            {id:"visor_purple",slot:"visor",price:{coins:150}},
            {id:"cape_violet",slot:"cape",price:{gems:5}},
            {id:"charm_sun",slot:"charm",price:null}
          ],
          store:{daily:["headband_red","scarf_teal","visor_purple"],weekly:["cape_violet","charm_sun"]},
          questions:[]
        };
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
  function renderHome(){
    return wrapPhone(screen(t("home"),
      '<a class="btn" href="#/modes" style="width:100%;margin-top:6px">'+t("modesTitle")+'</a>' +
      '<a class="btn" href="#/customization" style="width:100%;margin-top:6px">'+t("avatarTitle")+'</a>' +
      '<a class="btn" href="#/store" style="width:100%;margin-top:6px">'+t("storeTitle")+'</a>' +
      '<button class="btn" id="btnReset" style="width:100%;margin-top:6px">'+t("reset")+'</button>'
    ));
  }

  function categories(){ return uniq(ALL_QUESTIONS.map(function(q){return q.category;})); }
  function difficulties(){ return uniq(ALL_QUESTIONS.map(function(q){return q.difficulty;})); }

  function renderModes(){
    var cats = categories();
    var diffs = difficulties();
    var catOpts = '<option value="any" '+(state.filters.category==="any"?'selected':'')+'>'+t("any")+'</option>'+
      cats.map(function(c){ return '<option value="'+c+'" '+(state.filters.category===c?'selected':'')+'>'+c+'</option>'; }).join("");
    var diffOpts = '<option value="any" '+(state.filters.difficulty==="any"?'selected':'')+'>'+t("any")+'</option>'+
      diffs.map(function(d){ return '<option value="'+d+'" '+(state.filters.difficulty===d?'selected':'')+'>'+d+'</option>'; }).join("");

    var modes = [
      {id:"quick", name:"Quick Match", playable:true},
      {id:"story", name:"Story Adventure", playable:false},
      {id:"h2h",   name:"Head-to-Head",   playable:false},
      {id:"race",  name:"Treasure Race",  playable:false},
      {id:"kb",    name:"Knowledge Bomb", playable:false},
      {id:"tourn", name:"Tournaments",    playable:false}
    ];
    var list = modes.map(function(m){
      return '<div class="card" style="margin-top:8px"><div class="row" style="justify-content:space-between"><strong>'+m.name+
             '</strong>'+(m.playable?'<button class="btn cta" data-start-mode="'+m.id+'">'+t("playNow")+'</button>':'<span class="badge">'+t("inProgress")+'</span>')+
             '</div></div>';
    }).join("");

    return wrapPhone(
      screen(t("modesTitle"),
        '<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:8px">'+
          '<label class="kbd" style="flex:1">'+t("category")+'<select id="selCat" style="width:100%;margin-top:4px">'+catOpts+'</select></label>'+
          '<label class="kbd" style="flex:1">'+t("difficulty")+'<select id="selDiff" style="width:100%;margin-top:4px">'+diffOpts+'</select></label>'+
        '</div>'+ list
      )
    );
  }
  function wireModes(){
    var cSel=$("#selCat"); if (cSel) cSel.addEventListener("change", function(e){ state.filters.category=e.target.value||"any"; });
    var dSel=$("#selDiff"); if (dSel) dSel.addEventListener("change", function(e){ state.filters.difficulty=e.target.value||"any"; });

    $all("[data-start-mode]").forEach(function(btn){
      btn.addEventListener("click", function(){
        state.currentMode = btn.getAttribute("data-start-mode");
        state.lobby = {players:2,timeMs:20000,powerups:true};
        state.questionIx=0; state.score=0; state.streak=0; state._awarded=false;

        // حوض الأسئلة حسب الفلاتر
        var pool = ALL_QUESTIONS.filter(function(q){
          var byCat = (state.filters.category==="any") || (q.category===state.filters.category);
          var byDiff= (state.filters.difficulty==="any") || (q.difficulty===state.filters.difficulty);
          return byCat && byDiff;
        });
        if (!pool.length) pool = ALL_QUESTIONS.slice();
        QUESTIONS = pool;
        Q_ORDER = shuffle(Array(QUESTIONS.length).fill(0).map(function(_,i){return i;}));

        location.hash="#/lobby";
      });
    });
  }

  function renderLobby(){
    return wrapPhone(screen(t("lobbyTitle"),
      '<div class="card">'+
        '<div class="row" style="justify-content:space-between;gap:8px;flex-wrap:wrap">'+
          '<div><span class="badge">'+t("mode")+'</span> <strong>'+(state.currentMode||"—")+'</strong></div>'+
          '<div class="badge">'+t("players")+': '+state.lobby.players+'</div>'+
          '<div class="badge">'+t("category")+': '+(state.filters.category||"any")+'</div>'+
          '<div class="badge">'+t("difficulty")+': '+(state.filters.difficulty||"any")+'</div>'+
        '</div>'+
        '<div class="row" style="margin-top:8px;gap:8px">'+
          '<label class="kbd" style="flex:1">'+t("players")+
            '<select id="selPlayers" style="width:100%;margin-top:4px">'+
              '<option value="2" '+(state.lobby.players===2?'selected':'')+'>2</option>'+
              '<option value="3" '+(state.lobby.players===3?'selected':'')+'>3</option>'+
              '<option value="4" '+(state.lobby.players===4?'selected':'')+'>4</option>'+
            '</select>'+
          '</label>'+
          '<label class="kbd" style="flex:1)">'+t("timePerQ")+
            '<select id="selTime" style="width:100%;margin-top:4px">'+
              '<option value="10000" '+(state.lobby.timeMs===10000?'selected':'')+'>10s</option>'+
              '<option value="20000" '+(state.lobby.timeMs===20000?'selected':'')+'>20s</option>'+
              '<option value="30000" '+(state.lobby.timeMs===30000?'selected':'')+'>30s</option>'+
            '</select>'+
          '</label>'+
        '</div>'+
        '<div class="row" style="margin-top:8px;justify-content:space-between;gap:8px;flex-wrap:wrap">'+
          '<div class="kbd">'+t("powerups")+': <button id="btnPower" class="btn" style="margin-inline-start:6px">'+(state.lobby.powerups?t("on"):t("off"))+'</button></div>'+
          '<div class="kbd">'+t("sound")+': <button id="btnSound" class="btn" style="margin-inline-start:6px">'+(settings.sound?t("on"):t("off"))+'</button></div>'+
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
    var sp=$("#selPlayers"); if (sp) sp.addEventListener("change", function(e){ state.lobby.players=parseInt(e.target.value,10); render(); });
    var st=$("#selTime");    if (st) st.addEventListener("change",  function(e){ state.lobby.timeMs=parseInt(e.target.value,10); });
    var bp=$("#btnPower");   if (bp) bp.addEventListener("click",   function(){ state.lobby.powerups=!state.lobby.powerups; render(); });
    var bs=$("#btnStart");   if (bs) bs.addEventListener("click",   function(ev){ ev.preventDefault(); ev.stopPropagation(); state.questionIx=0; state.score=0; state.streak=0; state._awarded=false; state._qAdvanced=false; state.route="question"; location.hash="#/question"; });
    var bsnd=$("#btnSound"); if (bsnd) bsnd.addEventListener("click", function(){ settings.sound=!settings.sound; saveSettings(); render(); });
  }

  // ===== Question screen =====
  function renderQuestion(){
    if (state._remaining !== state.lobby.timeMs) state._remaining = state.lobby.timeMs;
    state._frozen=false; state._shieldActive=false; // reset لكل سؤال جديد

    var q = QUESTIONS[ Q_ORDER[state.questionIx] ];
    var prompt = (lang==="ar")? q.prompt_ar : q.prompt_en;
    var opts = q.answers.map(function(a,i){ return {txt:(lang==="ar"?a.ar:a.en), ok:!!a.correct, i:i}; });
    opts = shuffle(opts);

    var powerRow = '';
    if (state.lobby.powerups){
      powerRow =
        '<div class="row" style="gap:6px;margin-bottom:6px;flex-wrap:wrap">'+
          '<button class="btn" id="pHint">💡 '+t("hint")+' (-'+COSTS.hint+' '+t("coins")+')</button>'+
          '<button class="btn" id="pFreeze">⏸ '+t("freeze")+' (-'+COSTS.freeze+' '+t("coins")+')</button>'+
          '<button class="btn" id="pShield">🛡 '+t("shield")+' (-'+COSTS.shield+' '+t("coins")+')</button>'+
        '</div>';
    }

    return wrapPhone(screen(t("questionTitle"),
      '<div class="row" style="justify-content:space-between;margin-bottom:8px">'+
        '<span class="kbd">'+t("score")+': '+state.score+'</span>'+
        '<span class="kbd">'+t("streak")+': '+state.streak+'</span>'+
      '</div>'+
      powerRow+
      '<div class="h2" style="margin-bottom:8px">'+prompt+'</div>'+
      '<div style="display:flex;flex-direction:column;gap:8px">'+
        opts.map(function(o){ return '<button class="opt btn" style="width:100%;text-align:start" data-ix="'+o.i+'" data-ok="'+(o.ok?'1':'0')+'">'+o.txt+'</button>'; }).join("")+
      '</div>'+
      '<div class="meta" style="margin-top:10px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">'+
        '<span class="badge">Round '+(state.questionIx+1)+'/'+QUESTIONS.length+'</span>'+
        '<span class="badge" id="timer">'+mmss(state._remaining)+'</span>'+
        (state.lobby.powerups?'<span class="badge" id="pfreeze" style="display:none">⏸</span><span class="badge" id="pshield" style="display:none">🛡</span>':'')+
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
      if (state._frozen){ if (timerEl) timerEl.textContent = mmss(state._remaining); return; }
      state._remaining -= 100;
      if (timerEl) timerEl.textContent = mmss(state._remaining);
      if (state._remaining <= 0){
        clearInterval(state._timerId);
        state.streak = state._shieldActive ? state.streak : 0; // shield يمنع كسر السلسلة
        state._shieldActive = false;
        state._qAdvanced = true;
        setTimeout(nextStep, 10);
      }
    }, 100);
  }
  function nextStep(){
    if (state.questionIx < Q_ORDER.length - 1) {
      state.questionIx++;
      if (state.route === "question") render();
      else location.hash = "#/question";
    } else {
      location.hash = "#/results";
    }
  }

  function useCoins(amount){
    if (state.wallet.coins < amount){ alert(t("notEnough")); return false; }
    state.wallet.coins -= amount; saveWallet(); return true;
  }

  function wirePowerups(){
    var freezeBadge = $("#pfreeze");
    var shieldBadge = $("#pshield");

    // HINT: أخفِ خيارًا خاطئًا بالكامل
    var btnH=$("#pHint");
    if (btnH) btnH.addEventListener("click", function(){
      if (!useCoins(COSTS.hint)) return;
      var wrong = $all(".opt").filter(function(b){
        return b.getAttribute("data-ok")==="0" && !b.disabled && b.style.display!=="none";
      });
      if (!wrong.length) return;
      var pick = wrong[Math.floor(Math.random()*wrong.length)];
      pick.setAttribute("aria-hidden","true");
      pick.style.display = "none"; // ← إخفاء كامل
    });

    // FREEZE: إيقاف المؤقّت 5 ثوانٍ
    var btnF=$("#pFreeze");
    if (btnF) btnF.addEventListener("click", function(){
      if (state._frozen) return;
      if (!useCoins(COSTS.freeze)) return;
      state._frozen = true;
      if (freezeBadge) freezeBadge.style.display = "inline-block";
      setTimeout(function(){ state._frozen=false; if (freezeBadge) freezeBadge.style.display="none"; }, 5000);
    });

    // SHIELD: يحمي السلسلة من الانكسار لخطأ واحد
    var btnS=$("#pShield");
    if (btnS) btnS.addEventListener("click", function(){
      if (state._shieldActive) return;
      if (!useCoins(COSTS.shield)) return;
      state._shieldActive = true;
      if (shieldBadge) shieldBadge.style.display = "inline-block";
    });
  }

  function wireQuestion(){
    state._qAdvanced=false; startTimer(); wirePowerups();

    $all(".opt").forEach(function(btn){
      btn.addEventListener("click", function(){
        if (state._qAdvanced) return;
        var ok = btn.getAttribute("data-ok")==="1";
        $all(".opt").forEach(function(b){ b.disabled=true; });
        btn.classList.add(ok?"correct":"wrong");
        var nb=$("#nextBtn"); if (nb) nb.textContent = ok ? t("correct") : t("wrong");
        state._qAdvanced=true;

        if (ok){
          snd("ok");
          var bonus = Math.ceil(state._remaining/1000)*5;
          state.score += 100 + bonus; state.streak += 1;
        } else {
          snd("bad");
          if (!state._shieldActive) state.streak = 0;
          state._shieldActive = false;
        }
        setTimeout(nextStep, 700);
      });
    });
    var nb=$("#nextBtn");
    if (nb) nb.addEventListener("click", function(){
      if(!state._qAdvanced){ if (!state._shieldActive) state.streak=0; state._shieldActive=false; state._qAdvanced=true; }
      nextStep();
    });
  }

  // ===== Results =====
  function renderResults(){
    var coinsReward = Math.max(0, Math.round(state.score*0.10));
    return wrapPhone(screen(t("resultsTitle"),
      '<div class="card"><strong>'+t("score")+':</strong> '+state.score+'</div>'+
      '<div class="card"><strong>'+t("streak")+':</strong> '+state.streak+'</div>'+
      '<div class="card"><strong>'+t("reward")+':</strong> <span class="coin"></span> '+coinsReward+'</div>'+
      '<div class="row" style="margin-top:12px">'+
        '<a class="btn cta" id="claimBtn" style="flex:1)">'+t("again")+'</a>'+
        '<a class="btn" href="#/modes" style="flex:1)">'+t("modesTitle")+'</a>'+
      '</div>'
    ));
  }
  function wireResults(){
    var cb=$("#claimBtn");
    if (cb) cb.addEventListener("click", function(){
      var coinsReward = Math.max(0, Math.round(state.score*0.10));
      if (!state._awarded){ state.wallet.coins += coinsReward; saveWallet(); state._awarded = true; }
      state.questionIx=0; state.score=0; state.streak=0; state._qAdvanced=false;
      Q_ORDER = shuffle(Array(QUESTIONS.length).fill(0).map(function(_,i){return i;}));
      location.hash="#/question";
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
    var c=state.content; var ownedMap={}; state.owned.forEach(function(id){ownedMap[id]=1;});
    var char=c.characters[0]; var outfits=c.cosmetics;
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
        '<div><div><strong>'+((lang==="ar")?char.name_ar:char.name_en)+' — '+char.default.colorway+'</strong></div>'+
        '<div class="row" style="margin-top:6px">'+equippedBadges+'</div></div>'+
      '</div>'+
      outfits.map(item).join("")+
      '<div class="row" style="margin-top:12px">'+
        '<div class="kbd" style="flex:1;text-align:center)">'+t("coins")+': '+state.wallet.coins+'</div>'+
        '<div class="kbd" style="flex:1;text-align:center)">'+t("gems")+': '+state.wallet.gems+'</div>'+
      '</div>'
    ));
  }
  function wireCustomization(){
    $all("[data-buy]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var id=btn.getAttribute("data-buy");
        var item=(state.content.cosmetics || []).find(function(x){return x.id===id;}) || {};
        var price=item.price || {};
        var ask = (!price || (!price.coins && !price.gems)) ? true : confirm(t("confirmBuy")+" — "+fmtPrice(price));
        if (!ask) return;
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

  // ===== Store page =====
  function renderStore(){
    var c = state.content;
    var owned = new Set(state.owned);
    var items = [].concat(
      c.store.daily.map(function(id){ return c.cosmetics.find(function(x){ return x.id===id; }); }),
      c.store.weekly.map(function(id){ return c.cosmetics.find(function(x){ return x.id===id; }); })
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
        var id = btn.getAttribute("data-store-buy");
        var item = (state.content.cosmetics || []).find(function(x){ return x.id===id; }) || {};
        var price = item.price || {};
        var ask = (!price || (!price.coins && !price.gems)) ? true : confirm(t("confirmBuy")+" — "+fmtPrice(price));
        if (!ask) return;
        if (price.coins && state.wallet.coins < price.coins){ alert(t("notEnough")); return; }
        if (price.gems  && state.wallet.gems  < price.gems ){ alert(t("notEnough")); return; }
        if (price.coins) state.wallet.coins -= price.coins;
        if (price.gems ) state.wallet.gems  -= price.gems;
        state.owned.push(id);
        saveOwned(); saveWallet();
        render();
      });
    });
    $all("[data-store-equip]").forEach(function(btn){
      btn.addEventListener("click", function(){
        var id = btn.getAttribute("data-store-equip");
        var slot = btn.getAttribute("data-slot");
        if (state.owned.indexOf(id) === -1){ alert(t("needOwn")); return; }
        state.equipped[slot] = id;
        saveEquipped();
        render();
      });
    });
  }

  // ===== mark active tab =====
  function markActiveTab(){
    var r = state.route || "splash";
    $all("header .tabs a").forEach(function(a){
      var isActive = (a.getAttribute("href") === "#/"+r);
      if (isActive) a.classList.add("active"); else a.classList.remove("active");
    });
  }

  // ===== render =====
  function render(){
    var app = getApp();
    loadContent(function(){
      clearInterval(state._timerId);
      var html="";
      switch(state.route){
        case "splash":    html = renderSplash();        break;
        case "home":      html = renderHome();          break;
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
        case "home":          $("#btnReset") && $("#btnReset").addEventListener("click", function(){ localStorage.clear(); location.reload(); }); break;
        case "modes":         wireModes();         break;
        case "lobby":         wireLobby();         break;
        case "question":      wireQuestion();      break;
        case "results":       wireResults();       break;
        case "customization": wireCustomization(); break;
        case "store":         wireStore();         break;
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
