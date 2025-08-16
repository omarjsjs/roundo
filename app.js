/* Roundo v16 — ES5, content.json-driven questions + lobby filters (rounds/categories/difficulty)
   + new trophy avatar SVG, robust routing & event wiring */
(function(){
  'use strict';

  // ===== i18n =====
  var STR={
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
        mode:"النمط", you:"أنت", rounds:"الجولات", categories:"التصنيفات", difficulty:"الصعوبة",
        all:"الكل", easy:"سهل", medium:"متوسط", hard:"صعب"},
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
        mode:"Mode", you:"You", rounds:"Rounds", categories:"Categories", difficulty:"Difficulty",
        all:"All", easy:"Easy", medium:"Medium", hard:"Hard"}
  };

  // ===== helpers =====
  function $(s,r){return (r||document).querySelector(s);}
  function $all(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s));}
  function t(k){return (STR[lang]&&STR[lang][k])||k;}
  function safeText(id,txt){var el=$("#"+id); if(el) el.textContent=txt;}
  function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var x=a[i];a[i]=a[j];a[j]=x;}return a;}
  function mmss(ms){var s=Math.max(0,Math.ceil(ms/1000));return Math.floor(s/60)+":"+("0"+(s%60)).slice(-2);}

  // ===== state =====
  var urlLang=new URLSearchParams(location.search).get("lang");
  var lang=urlLang||localStorage.getItem("roundo_lang")||"ar";
  var theme=localStorage.getItem("roundo_theme")||"dark";

  var state={
    route:(location.hash.replace("#/","")||"splash"),
    wallet:JSON.parse(localStorage.getItem("roundo_wallet")||'{"coins":2000,"gems":150}'),
    owned:JSON.parse(localStorage.getItem("roundo_owned")||"[]"),
    equipped:JSON.parse(localStorage.getItem("roundo_equipped")||'{"headband":null,"scarf":null,"visor":null,"cape":null,"charm":null}'),
    content:null,
    currentMode:null,
    questionIx:0, score:0, streak:0, _awarded:false,
    _qAdvanced:false, _timerId:null, _remaining:20000,
    lobby:{players:2,timeMs:20000,powerups:true,rounds:6,cats:[],diffs:[]}
  };
  var Q_ALL=[];    // normalized from content.json
  var Q_ACTIVE=[]; // filtered for the match
  var Q_ORDER=[];

  function saveOwned(){localStorage.setItem("roundo_owned",JSON.stringify(state.owned));}
  function saveWallet(){localStorage.setItem("roundo_wallet",JSON.stringify(state.wallet));}
  function saveEquipped(){localStorage.setItem("roundo_equipped",JSON.stringify(state.equipped));}
  function fmtPrice(p){return !p?t("free"):(p.coins?(p.coins+" "+t("coins")):(p.gems+" "+t("gems")));}

  // ===== mount #app if missing =====
  function getApp(){
    var app=$("#app");
    if(!app){app=document.createElement("main");app.id="app";var header=$("header")||document.body;header.parentNode.insertBefore(app,header.nextSibling);}
    return app;
  }

  // ===== routing/lang/theme =====
  window.addEventListener("hashchange",function(){state.route=location.hash.replace("#/","")||"splash";render();});
  function setLang(l){lang=l;localStorage.setItem("roundo_lang",l);
    document.documentElement.lang=l;document.documentElement.dir=(l==="ar"?"rtl":"ltr");
    safeText("t_app",t("app"));safeText("t_badge",STR[lang].badge);
    safeText("t_home",t("home"));safeText("t_modes",t("modes"));safeText("t_lobby",t("lobby"));safeText("t_store",t("store"));
    var bl=$("#btnLang");if(bl) bl.textContent=(l==="ar"?"EN":"AR");render();
  }
  function setTheme(m){theme=m;localStorage.setItem("roundo_theme",m);
    if(theme==="light") document.body.classList.add("theme-light"); else document.body.classList.remove("theme-light");
  }

  // ===== content =====
  function normalizeQuestions(){
    Q_ALL = [];
    var arr=(state.content&&state.content.questions)||[];
    for(var i=0;i<arr.length;i++){
      var q=arr[i];
      var item={
        id:q.id||i+1,
        category:q.category||"general",
        difficulty:q.difficulty||"easy",
        prompt_ar:(q.ar&&q.ar.prompt)||q.prompt_ar||"",
        prompt_en:(q.en&&q.en.prompt)||q.prompt_en||"",
        answers:[]
      };
      // answers (ar/en arrays with {text,correct})
      var aa=(q.ar&&q.ar.answers)||[];
      var ae=(q.en&&q.en.answers)||[];
      // align by index
      var m=Math.max(aa.length,ae.length);
      for(var k=0;k<m;k++){
        var a_ar=aa[k]||{};
        var a_en=ae[k]||{};
        item.answers.push({
          ar:a_ar.text||a_ar.ar||"",
          en:a_en.text||a_en.en||"",
          correct:!!(a_ar.correct||a_en.correct)
        });
      }
      Q_ALL.push(item);
    }
  }
  function unique(list, key){
    var s={};var out=[];
    for(var i=0;i<list.length;i++){ var v=list[i][key]||"general"; if(!s[v]){s[v]=1;out.push(v);} }
    return out;
  }
  function loadContent(cb){
    if(state.content){ if(cb) cb(); return; }
    fetch("content.json",{cache:"no-store"})
      .then(function(r){ if(!r.ok) throw new Error("load"); return r.json(); })
      .then(function(json){ state.content=json; normalizeQuestions(); if(cb) cb(); })
      .catch(function(){
        // fallback minimal
        state.content={
          characters:[{name_ar:"كأس",name_en:"Trophy",default:{colorway:"gold"}}],
          cosmetics:[
            {id:"headband_red",slot:"headband",price:{coins:600}},
            {id:"scarf_teal",slot:"scarf",price:{coins:1200}},
            {id:"visor_purple",slot:"visor",price:{gems:80}},
            {id:"cape_gold",slot:"cape",price:{gems:120}},
            {id:"medal_charm",slot:"charm",price:{coins:900}}
          ],
          store:{daily:["headband_red","scarf_teal"],weekly:["visor_purple","cape_gold","medal_charm"]},
          questions:[{
            id:1,category:"general",difficulty:"easy",
            ar:{prompt:"ما عاصمة فرنسا؟",answers:[{text:"باريس",correct:true},{text:"روما"},{text:"مدريد"},{text:"برلين"}]},
            en:{prompt:"What is the capital of France?",answers:[{text:"Paris",correct:true},{text:"Rome"},{text:"Madrid"},{text:"Berlin"}]}
          }]
        };
        normalizeQuestions(); if(cb) cb();
      });
  }

  // ===== layout helpers =====
  function wrapPhone(inner){return '<div style="width:min(420px,94vw);margin:12px auto;display:flex;flex-direction:column;gap:12px">'+inner+'</div>';}
  function screen(title,body){return '<section class="card" style="width:100%"><div class="h1">'+title+'</div>'+body+'</section>';}

  // ===== pages =====
  function renderSplash(){
    return wrapPhone(
      screen(t("splashTitle"),
        '<div class="row"><div class="kbd">'+t("quickPlay")+'</div>'+
        '<a class="btn cta" href="#/modes" style="flex:1">'+t("playNow")+'</a></div>'+
        screen(t("abilities"),'<div class="badge">Hint / Freeze / Shield</div>')+
        screen(t("traps"),'<div class="badge">Scramble / Fog</div>')+
        screen(t("progress"),'<div class="badge">Treasure Map</div>')
      )
    );
  }
  function renderHome(){
    return wrapPhone(screen(t("home"),
      '<a class="btn" href="#/modes" style="width:100%;margin-top:6px">'+t("modesTitle")+'</a>'+
      '<a class="btn" href="#/customization" style="width:100%;margin-top:6px">'+t("avatarTitle")+'</a>'+
      '<a class="btn" href="#/store" style="width:100%;margin-top:6px">'+t("storeTitle")+'</a>'
    ));
  }
  function renderModes(){
    var modes=[
      {id:"quick",name:"Quick Match",playable:true},
      {id:"story",name:"Story Adventure",playable:false},
      {id:"h2h",name:"Head-to-Head",playable:false},
      {id:"race",name:"Treasure Race",playable:false},
      {id:"kb",name:"Knowledge Bomb",playable:false},
      {id:"tourn",name:"Tournaments",playable:false}
    ];
    var list=modes.map(function(m){
      return '<div class="card" style="margin-top:8px">'+
        '<div class="row" style="justify-content:space-between;align-items:center">'+
          '<strong>'+m.name+'</strong>'+
          (m.playable?'<button class="btn cta" data-start-mode="'+m.id+'">'+t("playNow")+'</button>':'<span class="badge">'+t("inProgress")+'</span>')+
        '</div></div>';
    }).join("");
    return wrapPhone(screen(t("modesTitle"),list));
  }
  function wireModes(){
    $all("[data-start-mode]").forEach(function(btn){
      btn.addEventListener("click",function(){
        state.currentMode=btn.getAttribute("data-start-mode");
        state.lobby.players=2; state.lobby.timeMs=20000; state.lobby.powerups=true;
        state.lobby.rounds=6; state.lobby.cats=[]; state.lobby.diffs=[];
        state.questionIx=0; state.score=0; state.streak=0; state._awarded=false;
        location.hash="#/lobby";
      });
    });
  }

  // build filter chips
  function chips(items, activeSet, dataAttr, allowMulti){
    return items.map(function(it){
      var active = activeSet.indexOf(it)>=0;
      return '<button class="btn '+(active?'cta':'')+'" data-'+dataAttr+'="'+it+'">'+it+'</button>';
    }).join(' ');
  }

  function renderLobby(){
    // dynamic cats/diffs from content
    var cats = unique(Q_ALL,"category");
    var diffs = unique(Q_ALL,"difficulty");
    // labels (localized)
    var catsLabels = [t("all")].concat(cats);
    var diffsLabels = [t("all"), t("easy"), t("medium"), t("hard")];
    // map to keys
    var diffKeys = ["all","easy","medium","hard"];

    return wrapPhone(screen(t("lobbyTitle"),
      '<div class="card">'+
        '<div class="row" style="justify-content:space-between">'+
          '<div><span class="badge">'+t("mode")+'</span> <strong>'+(state.currentMode||"—")+'</strong></div>'+
          '<div class="badge">'+t("players")+': '+state.lobby.players+'</div>'+
        '</div>'+

        // players & time
        '<div class="row" style="margin-top:8px;gap:8px">'+
          '<label class="kbd" style="flex:1">'+t("players")+
            '<select id="selPlayers" style="width:100%;margin-top:4px">'+
              '<option value="2" '+(state.lobby.players===2?'selected':'')+'>2</option>'+
              '<option value="3" '+(state.lobby.players===3?'selected':'')+'>3</option>'+
              '<option value="4" '+(state.lobby.players===4?'selected':'')+'>4</option>'+
            '</select></label>'+
          '<label class="kbd" style="flex:1">'+t("timePerQ")+
            '<select id="selTime" style="width:100%;margin-top:4px">'+
              '<option value="10000" '+(state.lobby.timeMs===10000?'selected':'')+'>10s</option>'+
              '<option value="20000" '+(state.lobby.timeMs===20000?'selected':'')+'>20s</option>'+
              '<option value="30000" '+(state.lobby.timeMs===30000?'selected':'')+'>30s</option>'+
            '</select></label>'+
        '</div>'+

        // rounds
        '<div class="row" style="margin-top:8px;gap:8px">'+
          '<label class="kbd" style="flex:1">'+t("rounds")+
            '<select id="selRounds" style="width:100%;margin-top:4px">'+
              [3,6,10,15].map(function(n){return '<option value="'+n+'" '+(state.lobby.rounds===n?'selected':'')+'>'+n+'</option>';}).join('')+
            '</select></label>'+
          '<div class="kbd" style="flex:1">'+t("powerups")+': '+
            '<button id="btnPower" class="btn" style="margin-inline-start:6px">'+(state.lobby.powerups?t("on"):t("off"))+'</button>'+
          '</div>'+
        '</div>'+

        // categories
        '<div class="card" style="margin-top:10px">'+
          '<div class="h2">'+t("categories")+'</div>'+
          '<div class="row" style="gap:6px;flex-wrap:wrap">'+
            '<button class="btn '+(state.lobby.cats.length===0?'cta':'')+'" data-cat-all="1">'+t("all")+'</button>'+
            cats.map(function(c){var active=state.lobby.cats.indexOf(c)>=0;return '<button class="btn '+(active?'cta':'')+'" data-cat="'+c+'">'+c+'</button>';}).join(' ')+
          '</div>'+
        '</div>'+

        // difficulty
        '<div class="card" style="margin-top:10px">'+
          '<div class="h2">'+t("difficulty")+'</div>'+
          '<div class="row" style="gap:6px;flex-wrap:wrap">'+
            ['easy','medium','hard'].map(function(d){
              var active=(state.lobby.diffs.length===0 && d==='easy' && false) ? true : (state.lobby.diffs.indexOf(d)>=0);
              // show 'All' button too
              return '';
            }).join('')+
            '<button class="btn '+(state.lobby.diffs.length===0?'cta':'')+'" data-diff-all="1">'+t("all")+'</button>'+
            ['easy','medium','hard'].map(function(d){
              var active=state.lobby.diffs.indexOf(d)>=0;
              return '<button class="btn '+(active?'cta':'')+'" data-diff="'+d+'">'+t(d)+'</button>';
            }).join('')+
          '</div>'+
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
    var sp=$("#selPlayers"); if(sp) sp.addEventListener("change",function(e){state.lobby.players=parseInt(e.target.value,10); render();});
    var st=$("#selTime"); if(st) st.addEventListener("change",function(e){state.lobby.timeMs=parseInt(e.target.value,10);});
    var sr=$("#selRounds"); if(sr) sr.addEventListener("change",function(e){state.lobby.rounds=parseInt(e.target.value,10);});
    var bp=$("#btnPower"); if(bp) bp.addEventListener("click",function(){state.lobby.powerups=!state.lobby.powerups; render();});

    // categories
    $all("[data-cat]").forEach(function(btn){
      btn.addEventListener("click",function(){
        var c=btn.getAttribute("data-cat");
        var ix=state.lobby.cats.indexOf(c);
        if(ix>=0) state.lobby.cats.splice(ix,1); else state.lobby.cats.push(c);
        render();
      });
    });
    var ca=$("[data-cat-all]"); if(ca) ca.addEventListener("click",function(){state.lobby.cats=[]; render();});

    // difficulty
    $all("[data-diff]").forEach(function(btn){
      btn.addEventListener("click",function(){
        var d=btn.getAttribute("data-diff");
        var ix=state.lobby.diffs.indexOf(d);
        if(ix>=0) state.lobby.diffs.splice(ix,1); else state.lobby.diffs.push(d);
        render();
      });
    });
    var da=$("[data-diff-all]"); if(da) da.addEventListener("click",function(){state.lobby.diffs=[]; render();});

    // start
    var bs=$("#btnStart"); if(bs) bs.addEventListener("click",startMatch);
  }

  function startMatch(){
    // filters
    var cats = state.lobby.cats.length? state.lobby.cats : unique(Q_ALL,"category");
    var diffs = state.lobby.diffs.length? state.lobby.diffs : unique(Q_ALL,"difficulty");
    // pool
    var pool=Q_ALL.filter(function(q){return cats.indexOf(q.category)>=0 && diffs.indexOf(q.difficulty)>=0;});
    if(pool.length===0) pool=Q_ALL.slice(); // أمان
    shuffle(pool);
    // pick rounds
    var n=Math.max(1, Math.min(state.lobby.rounds, pool.length));
    Q_ACTIVE = pool.slice(0,n);
    Q_ORDER = []; for(var i=0;i<Q_ACTIVE.length;i++) Q_ORDER.push(i);
    state.questionIx=0; state.score=0; state.streak=0; state._awarded=false;
    location.hash="#/question";
  }

  function currentQuestion(){
    var idx=Q_ORDER[state.questionIx]||0;
    return Q_ACTIVE[idx]||Q_ALL[0];
  }

  function renderQuestion(){
    if(!Q_ACTIVE.length){ startMatch(); return ""; }
    var q=currentQuestion();
    if(state._remaining!==state.lobby.timeMs) state._remaining=state.lobby.timeMs;
    var prompt=(lang==="ar")?q.prompt_ar:q.prompt_en;
    var opts=q.answers.map(function(a,i){return {txt:(lang==="ar"?a.ar:a.en), ok:!!a.correct, i:i};});
    opts=shuffle(opts);

    return wrapPhone(screen(t("questionTitle"),
      '<div class="row" style="justify-content:space-between;margin-bottom:8px">'+
        '<span class="kbd">'+t("score")+': '+state.score+'</span>'+
        '<span class="kbd">'+t("streak")+': '+state.streak+'</span>'+
      '</div>'+
      '<div class="h2" style="margin-bottom:8px">'+prompt+'</div>'+
      '<div style="display:flex;flex-direction:column;gap:8px">'+
        opts.map(function(o){return '<button class="opt btn" style="width:100%;text-align:start" data-ix="'+o.i+'" data-ok="'+(o.ok?'1':'0')+'">'+o.txt+'</button>';}).join("")+
      '</div>'+
      '<div class="meta" style="margin-top:10px">'+
        '<span class="badge">Round '+(state.questionIx+1)+'/'+Q_ACTIVE.length+'</span>'+
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
    state._remaining=state.lobby.timeMs;
    var timerEl=$("#timer");
    state._timerId=setInterval(function(){
      if(state._qAdvanced){clearInterval(state._timerId);return;}
      state._remaining-=100;
      if(timerEl) timerEl.textContent=mmss(state._remaining);
      if(state._remaining<=0){clearInterval(state._timerId);state.streak=0;state._qAdvanced=true;setTimeout(nextStep,10);}
    },100);
  }
  function nextStep(){
    if(state.questionIx < Q_ORDER.length-1){ state.questionIx++; if(state.route==="question") render(); else location.hash="#/question"; }
    else { location.hash="#/results"; }
  }
  function wireQuestion(){
    state._qAdvanced=false; startTimer();
    $all(".opt").forEach(function(btn){
      btn.addEventListener("click",function(){
        if(state._qAdvanced) return;
        var ok=btn.getAttribute("data-ok")==="1";
        $all(".opt").forEach(function(b){b.disabled=true;});
        btn.classList.add(ok?"correct":"wrong");
        var nb=$("#nextBtn"); if(nb) nb.textContent=(ok?t("correct"):t("wrong"));
        state._qAdvanced=true;
        if(ok){var bonus=Math.ceil(state._remaining/1000)*5; state.score+=100+bonus; state.streak+=1;}
        else{state.streak=0;}
        setTimeout(nextStep,700);
      });
    });
    var nb=$("#nextBtn"); if(nb) nb.addEventListener("click",function(){ if(!state._qAdvanced){state.streak=0;state._qAdvanced=true;} nextStep(); });
  }

  function renderResults(){
    var coinsReward=Math.max(0,Math.round(state.score*0.10));
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
    if(cb) cb.addEventListener("click",function(){
      var coinsReward=Math.max(0,Math.round(state.score*0.10));
      if(!state._awarded){state.wallet.coins+=coinsReward;saveWallet();state._awarded=true;}
      state.questionIx=0;state.score=0;state.streak=0;state._qAdvanced=false;
      // إعادة تشكيل مجموعة جديدة بنفس الفلاتر
      startMatch();
    });
  }

  // ===== Avatar (new trophy SVG) =====
  function trophySVG(){
    var eq=state.equipped||{};
    var headband=eq.headband?'<rect x="78" y="70" width="100" height="12" rx="6" fill="#e11d48"/>' : '';
    var visor=eq.visor?'<rect x="88" y="112" width="80" height="10" rx="5" fill="#7c3aed" opacity="0.9"/>' : '';
    var scarf=eq.scarf?'<path d="M82 152 Q128 168 174 152 L174 165 Q128 185 82 165 Z" fill="#14b8a6"/>' : '';
    var cape=eq.cape?'<path d="M28 110 L128 208 L228 110 Q200 122 128 122 Q56 122 28 110" fill="#8b5cf6" opacity="0.5"/>' : '';
    var charm=eq.charm?'<circle cx="128" cy="182" r="10" fill="#ffd166" stroke="#a66f00" stroke-width="3"/>' : '';
    return ''+
    '<svg width="130" height="130" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">'+
      '<defs>'+
        '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe27a"/><stop offset="1" stop-color="#ffb300"/></linearGradient>'+
        '<linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#ffb000"/></linearGradient>'+
      '</defs>'+
      cape+
      // handles
      '<path d="M46 90 q-34 8 -34 36 q0 28 34 36" fill="none" stroke="#ffb000" stroke-width="12" stroke-linecap="round"/>'+
      '<path d="M210 90 q34 8 34 36 q0 28 -34 36" fill="none" stroke="#ffb000" stroke-width="12" stroke-linecap="round"/>'+
      // cup
      '<path d="M56 86 h144 l-18 76 H74 Z" fill="url(#g)" stroke="#a66f00" stroke-width="8" />'+
      // face
      headband+
      '<ellipse cx="102" cy="124" rx="16" ry="12" fill="#fff" stroke="#2A2F45" stroke-width="3"/>'+
      '<ellipse cx="154" cy="124" rx="16" ry="12" fill="#fff" stroke="#2A2F45" stroke-width="3"/>'+
      '<circle cx="102" cy="124" r="6" fill="#2A2F45"/>'+
      '<circle cx="154" cy="124" r="6" fill="#2A2F45"/>'+
      visor+
      '<path d="M100 146 q28 18 56 0" fill="none" stroke="#2A2F45" stroke-width="5" stroke-linecap="round"/>'+
      // gloves
      '<circle cx="60" cy="130" r="12" fill="#fff" stroke="#cfcfcf"/>'+
      '<circle cx="196" cy="130" r="12" fill="#fff" stroke="#cfcfcf"/>'+
      // stem & base
      scarf+
      '<rect x="96" y="160" width="64" height="36" rx="6" fill="url(#g2)" stroke="#a66f00" stroke-width="6"/>'+
      charm+
      '<rect x="64" y="200" width="128" height="28" rx="10" fill="url(#g2)" stroke="#a66f00" stroke-width="6"/>'+
    '</svg>';
  }
  function renderCustomization(){
    var c=state.content; var ownedMap={}; state.owned.forEach(function(id){ownedMap[id]=1;});
    var char=c.characters[0]||{name_ar:"كأس",name_en:"Trophy",default:{colorway:"gold"}};
    var outfits=c.cosmetics||[];
    var equippedBadges=Object.keys(state.equipped).map(function(slot){
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
        '<div class="preview">'+trophySVG()+'</div>'+
        '<div><div><strong>'+((lang==="ar")?char.name_ar:char.name_en)+' — '+(char.default&&char.default.colorway||"")+'</strong></div>'+
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
      btn.addEventListener("click",function(){
        var id=btn.getAttribute("data-buy");
        var item=(state.content.cosmetics||[]).find(function(x){return x.id===id;})||{};
        var price=item.price||{};
        if(price.coins && state.wallet.coins<price.coins){alert(t("notEnough"));return;}
        if(price.gems && state.wallet.gems<price.gems){alert(t("notEnough"));return;}
        if(price.coins) state.wallet.coins-=price.coins;
        if(price.gems) state.wallet.gems-=price.gems;
        state.owned.push(id); saveOwned(); saveWallet(); render();
      });
    });
    $all("[data-equip]").forEach(function(btn){
      btn.addEventListener("click",function(){ state.equipped[btn.getAttribute("data-slot")]=btn.getAttribute("data-equip"); saveEquipped(); render(); });
    });
    $all("[data-unequip]").forEach(function(btn){
      btn.addEventListener("click",function(){ state.equipped[btn.getAttribute("data-unequip")]=null; saveEquipped(); render(); });
    });
  }

  function renderStore(){
    var c=state.content; var owned=new Set(state.owned);
    var items=[].concat(
      (c.store.daily||[]).map(function(id){return (c.cosmetics||[]).find(function(x){return x.id===id;});}),
      (c.store.weekly||[]).map(function(id){return (c.cosmetics||[]).find(function(x){return x.id===id;});})
    ).filter(Boolean);

    function card(o){
      var isOwned=owned.has(o.id); var isEq=(state.equipped[o.slot]===o.id); var action="";
      if(!isOwned){ action='<button class="btn cta" data-store-buy="'+o.id+'">'+t("buy")+'</button>'; }
      else if(!isEq){ action='<button class="btn" data-store-equip="'+o.id+'" data-slot="'+o.slot+'">'+t("equip")+'</button>'; }
      else { action='<span class="badge">'+t("owned")+'</span>'; }
      return '<div class="card store-item" style="width:100%">'+
        '<div style="display:flex;justify-content:space-between;gap:8px;align-items:center">'+
          '<div><strong>'+o.id.replace(/_/g," ")+'</strong><div class="price">'+fmtPrice(o.price)+'</div></div>'+
          '<div>'+action+'</div></div></div>';
    }
    return wrapPhone(
      screen(t("storeTitle"), items.map(card).join("") )+
      '<div class="row" style="margin-top:12px">'+
        '<div class="kbd" style="flex:1;text-align:center">'+t("coins")+': '+state.wallet.coins+'</div>'+
        '<div class="kbd" style="flex:1;text-align:center">'+t("gems")+': '+state.wallet.gems+'</div>'+
      '</div>'
    );
  }
  function wireStore(){
    $all("[data-store-buy]").forEach(function(btn){
      btn.addEventListener("click",function(){
        var id=btn.getAttribute("data-store-buy");
        var item=(state.content.cosmetics||[]).find(function(x){return x.id===id;})||{};
        var price=item.price||{};
        if(price.coins && state.wallet.coins<price.coins){alert(t("notEnough"));return;}
        if(price.gems && state.wallet.gems<price.gems){alert(t("notEnough"));return;}
        if(price.coins) state.wallet.coins-=price.coins;
        if(price.gems) state.wallet.gems-=price.gems;
        state.owned.push(id); saveOwned(); saveWallet(); render();
      });
    });
    $all("[data-store-equip]").forEach(function(btn){
      btn.addEventListener("click",function(){
        var id=btn.getAttribute("data-store-equip"); var slot=btn.getAttribute("data-slot");
        if(state.owned.indexOf(id)===-1){ alert(t("notEnough")); return; }
        state.equipped[slot]=id; saveEquipped(); render();
      });
    });
  }

  // ===== render orchestrator =====
  function markActiveTab(){
    var r=state.route||"splash";
    $all("header .tabs a").forEach(function(a){
      var isActive=(a.getAttribute("href")==="#/"+r);
      if(isActive) a.classList.add("active"); else a.classList.remove("active");
    });
  }
  function render(){
    var app=getApp();
    loadContent(function(){
      clearInterval(state._timerId);
      var html="";
      switch(state.route){
        case "splash": html=renderSplash(); break;
        case "home": html=renderHome(); break;
        case "modes": html=renderModes(); break;
        case "lobby": html=renderLobby(); break;
        case "question": html=renderQuestion(); break;
        case "results": html=renderResults(); break;
        case "customization": html=renderCustomization(); break;
        case "store": html=renderStore(); break;
        default: html=renderSplash();
      }
      app.innerHTML=html;
      if(typeof markActiveTab==="function") markActiveTab();

      // page-specific wiring
      switch(state.route){
        case "modes": wireModes(); break;
        case "lobby": wireLobby(); break;
        case "question": wireQuestion(); break;
        case "results": wireResults(); break;
        case "customization": wireCustomization(); break;
        case "store": wireStore(); break;
      }
    });
  }

  // ===== boot =====
  function boot(){
    var bl=$("#btnLang"); if(bl) bl.addEventListener("click",function(){setLang(lang==="ar"?"en":"ar");});
    var bt=$("#btnTheme"); if(bt) bt.addEventListener("click",function(){setTheme(theme==="dark"?"light":"dark");});
    setLang(lang); setTheme(theme); if(!location.hash) location.hash="#/splash"; render();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",boot); else boot();
})();
