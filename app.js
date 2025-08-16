/* Roundo v8 – Portrait-first + Modes → Lobby → Questions + Timer + Score/Streak + Rewards */
(() => {
  // ===== i18n =====
  const STR = {
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
        mode:"النمط", you:"أنت" },
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
        mode:"Mode", you:"You" }
  };

  // ===== utils/state =====
  const $  = (s, r=document)=>r.querySelector(s);
  const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
  const urlLang = new URLSearchParams(location.search).get("lang");
  let lang  = urlLang || localStorage.getItem("roundo_lang")  || "ar";
  let theme = localStorage.getItem("roundo_theme") || "dark";

  let state = {
    route: location.hash.replace("#/","") || "splash",
    wallet:   JSON.parse(localStorage.getItem("roundo_wallet")   || '{"coins":2000,"gems":150}'),
    owned:    JSON.parse(localStorage.getItem("roundo_owned")    || "[]"),
    equipped: JSON.parse(localStorage.getItem("roundo_equipped") || '{"headband":null,"scarf":null,"visor":null,"cape":null,"charm":null}'),
    content: null,
    currentMode: null,            // "quick"
    questionIx: 0,
    score: 0,
    streak: 0,
    _awarded: false,
    _qAdvanced: false,
    _timerId: null,
    _remaining: 20000,
    // إعدادات اللوبي
    lobby: { players: 2, timeMs: 20000, powerups: true }
  };

  const t = (k)=>STR[lang][k] || k;
  const setLang = (l)=>{
    lang=l; localStorage.setItem("roundo_lang",l);
    document.documentElement.lang=l; document.documentElement.dir=(l==="ar"?"rtl":"ltr");
    $("#t_app")?.textContent=t("app"); $("#t_badge")?.textContent=STR[lang].badge;
    $("#t_home")?.textContent=t("home"); $("#t_modes")?.textContent=t("modes");
    $("#t_lobby")?.textContent=t("lobby"); $("#t_store")?.textContent=t("store");
    $("#btnLang")?.textContent=(l==="ar"?"EN":"AR");
    render();
  };
  const setTheme = (m)=>{ theme=m; localStorage.setItem("roundo_theme",m); document.body.classList.toggle("theme-light", theme==="light"); };
  const saveOwned    = ()=>localStorage.setItem("roundo_owned", JSON.stringify(state.owned));
  const saveWallet   = ()=>localStorage.setItem("roundo_wallet", JSON.stringify(state.wallet));
  const saveEquipped = ()=>localStorage.setItem("roundo_equipped", JSON.stringify(state.equipped));
  const fmtPrice = (p)=>!p ? t("free") : (p.coins ? `${p.coins} ${t("coins")}` : `${p.gems} ${t("gems")}`);

  window.addEventListener("hashchange", ()=>{ state.route = location.hash.replace("#/","") || "splash"; render(); });

  async function loadContent(){
    if (state.content) return;
    const res = await fetch("content.json", {cache:"no-store"});
    state.content = await res.json();
  }

  // ===== force portrait overlay =====
  let overlay;
  function ensurePortraitOverlay(){
    const portrait = window.innerHeight >= window.innerWidth;
    if (!overlay){
      overlay = document.createElement("div");
      overlay.style.cssText = `position:fixed;inset:0;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.7);color:#fff;font:600 18px system-ui;z-index:9999;text-align:center;padding:20px`;
      overlay.innerHTML = `<div style="max-width:420px"><div style="font-size:40px;line-height:1">🔄</div><div style="margin-top:8px">${t("rotate")}</div></div>`;
      document.body.appendChild(overlay);
    }
    overlay.style.display = portrait ? "none" : "flex";
  }
  window.addEventListener("resize", ensurePortraitOverlay);
  window.addEventListener("orientationchange", ensurePortraitOverlay);

  // ===== view helpers (طولي) =====
  const wrapPhone = (inner)=>`
    <div style="width:min(420px,94vw);margin:12px auto;display:flex;flex-direction:column;gap:12px">
      ${inner}
    </div>`;
  const screen = (title, body)=>`<section class="card" style="width:100%"><div class="h1">${title}</div>${body}</section>`;

  // ===== Splash / Home / Modes =====
  function renderSplash(){
    return wrapPhone(
      screen(t("splashTitle"), `
        <div class="row"><div class="kbd">${t("quickPlay")}</div><a class="btn cta" href="#/modes" style="flex:1">${t("playNow")}</a></div>
        ${screen(t("abilities"), `<div class="badge">Hint / Freeze / Shield</div>`)}
        ${screen(t("traps"), `<div class="badge">Scramble / Fog</div>`)}
        ${screen(t("progress"), `<div class="badge">Treasure Map</div>`)}
      `)
    );
  }
  function renderHome(){
    return wrapPhone(
      screen(t("home"), `
        <a class="btn" href="#/modes" style="width:100%;margin-top:6px">${t("modesTitle")}</a>
        <a class="btn" href="#/customization" style="width:100%;margin-top:6px">${t("avatarTitle")}</a>
        <a class="btn" href="#/store" style="width:100%;margin-top:6px">${t("storeTitle")}</a>
      `)
    );
  }
  function renderModes(){
    const modes = [
      {id:"quick", name:"Quick Match", playable:true},
      {id:"story", name:"Story Adventure", playable:false},
      {id:"h2h",   name:"Head-to-Head",   playable:false},
      {id:"race",  name:"Treasure Race",  playable:false},
      {id:"kb",    name:"Knowledge Bomb", playable:false},
      {id:"tourn", name:"Tournaments",    playable:false},
    ];
    return wrapPhone(
      screen(t("modesTitle"),
        modes.map(m => `
          <div class="card" style="margin-top:8px">
            <div class="row" style="justify-content:space-between">
              <strong>${m.name}</strong>
              ${m.playable
                ? `<button class="btn cta" data-start-mode="${m.id}">${t("playNow")}</button>`
                : `<span class="badge">${t("inProgress")}</span>`}
            </div>
          </div>
        `).join("")
      )
    );
  }
  function wireModes(){
    $$("[data-start-mode]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        state.currentMode = btn.dataset.startMode;   // "quick"
        // إعدادات افتراضية للّوبي
        state.lobby = { players: 2, timeMs: 20000, powerups: true };
        // صفّر الجولة
        state.questionIx = 0; state.score = 0; state.streak = 0; state._awarded = false;
        location.hash = "#/lobby";
      });
    });
  }

  // ===== Lobby =====
  function renderLobby(){
    return wrapPhone(
      screen(t("lobbyTitle"), `
        <div class="card">
          <div class="row" style="justify-content:space-between">
            <div><span class="badge">${t("mode")}</span> <strong>${state.currentMode||"—"}</strong></div>
            <div class="badge">${t("players")}: ${state.lobby.players}</div>
          </div>
          <div class="row" style="margin-top:8px;gap:8px">
            <label class="kbd" style="flex:1">
              ${t("players")}
              <select id="selPlayers" style="width:100%;margin-top:4px">
                <option value="2" ${state.lobby.players===2?"selected":""}>2</option>
                <option value="3" ${state.lobby.players===3?"selected":""}>3</option>
                <option value="4" ${state.lobby.players===4?"selected":""}>4</option>
              </select>
            </label>
            <label class="kbd" style="flex:1">
              ${t("timePerQ")}
              <select id="selTime" style="width:100%;margin-top:4px">
                <option value="10000" ${state.lobby.timeMs===10000?"selected":""}>10s</option>
                <option value="20000" ${state.lobby.timeMs===20000?"selected":""}>20s</option>
                <option value="30000" ${state.lobby.timeMs===30000?"selected":""}>30s</option>
              </select>
            </label>
          </div>
          <div class="row" style="margin-top:8px;justify-content:space-between">
            <div class="kbd">${t("powerups")}:
              <button id="btnPower" class="btn" style="margin-inline-start:6px">${state.lobby.powerups?t("on"):t("off")}</button>
            </div>
            <a class="btn" href="#/modes">${t("modesTitle")}</a>
          </div>
        </div>

        <div class="card">
          <div class="h2">${t("players")}</div>
          <div class="row" style="gap:8px;flex-wrap:wrap">
            <span class="badge">${t("you")}</span>
            ${Array.from({length:state.lobby.players-1}).map((_,i)=>`<span class="badge">Friend#${200+i}</span>`).join("")}
          </div>
        </div>

        <button class="btn cta" id="btnStart" style="width:100%">${t("startMatch")}</button>
      `)
    );
  }
  function wireLobby(){
    $("#selPlayers")?.addEventListener("change", e=>{
      state.lobby.players = parseInt(e.target.value,10); render();
    });
    $("#selTime")?.addEventListener("change", e=>{
      state.lobby.timeMs = parseInt(e.target.value,10);
    });
    $("#btnPower")?.addEventListener("click", ()=>{
      state.lobby.powerups = !state.lobby.powerups;
      render();
    });
    $("#btnStart")?.addEventListener("click", ()=>{
      state.questionIx = 0; state.score = 0; state.streak = 0; state._awarded = false;
      location.hash = "#/question";
    });
  }

  // ===== Questions =====
  const QUESTIONS = [
    { id:1, prompt_ar:"ما عاصمة فرنسا؟", prompt_en:"What is the capital of France?",
      answers:[{ar:"باريس",en:"Paris",correct:true},{ar:"روما",en:"Rome"},{ar:"مدريد",en:"Madrid"},{ar:"برلين",en:"Berlin"}] },
    { id:2, prompt_ar:"٢ + ٢ = ؟", prompt_en:"2 + 2 = ?",
      answers:[{ar:"٣",en:"3"},{ar:"٤",en:"4",correct:true},{ar:"٥",en:"5"},{ar:"٦",en:"6"}] },
    { id:3, prompt_ar:"ما لون السماء الصافي عادةً؟", prompt_en:"What color is a clear sky?",
      answers:[{ar:"أحمر",en:"Red"},{ar:"أزرق",en:"Blue",correct:true},{ar:"أخضر",en:"Green"},{ar:"أصفر",en:"Yellow"}] },
    { id:4, prompt_ar:"أكبر كوكب في مجموعتنا الشمسية هو؟", prompt_en:"The largest planet in our solar system is?",
      answers:[{ar:"المشتري",en:"Jupiter",correct:true},{ar:"زحل",en:"Saturn"},{ar:"الأرض",en:"Earth"},{ar:"المريخ",en:"Mars"}] },
    { id:5, prompt_ar:"لغة تنسيق صفحات الويب هي؟", prompt_en:"The language used to style webpages is?",
      answers:[{ar:"HTML",en:"HTML"},{ar:"CSS",en:"CSS",correct:true},{ar:"SQL",en:"SQL"},{ar:"C++",en:"C++"}] },
    { id:6, prompt_ar:"عملة الإمارات العربية المتحدة؟", prompt_en:"The currency of the UAE?",
      answers:[{ar:"اليورو",en:"Euro"},{ar:"الدرهم",en:"Dirham",correct:true},{ar:"الدولار",en:"Dollar"},{ar:"الريال",en:"Riyal"}] },
  ];

  const mmss = (ms)=>{ const s=Math.max(0,Math.ceil(ms/1000)); const m=Math.floor(s/60); return `${m}:${String(s%60).padStart(2,"0")}`; };

  function renderQuestion(){
    // اضبط المؤقّت حسب اختيار اللوبي
    if (state._remaining !== state.lobby.timeMs) state._remaining = state.lobby.timeMs;

    const q = QUESTIONS[state.questionIx];
    const prompt = (lang==="ar")? q.prompt_ar : q.prompt_en;
    const opts = q.answers.map((a,i)=>({txt:(lang==="ar"?a.ar:a.en), ok:!!a.correct, i}));
    return wrapPhone(
      screen(t("questionTitle"), `
        <div class="row" style="justify-content:space-between;margin-bottom:8px">
          <span class="kbd">${t("score")}: ${state.score}</span>
          <span class="kbd">${t("streak")}: ${state.streak}</span>
        </div>
        <div class="h2" style="margin-bottom:8px">${prompt}</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${opts.map(o=>`<button class="opt btn" style="width:100%;text-align:start" data-ix="${o.i}" data-ok="${o.ok?'1':'0'}">${o.txt}</button>`).join("")}
        </div>
        <div class="meta" style="margin-top:10px">
          <span class="badge">Round ${state.questionIx+1}/${QUESTIONS.length}</span>
          <span class="badge" id="timer">${mmss(state._remaining)}</span>
        </div>
        <div class="row" style="margin-top:8px;justify-content:space-between">
          <a class="btn" href="#/lobby">⟵ ${t("lobby")}</a>
          <button class="btn" id="nextBtn">${t("next")}</button>
        </div>
      `)
    );
  }

  function startTimer(){
    clearInterval(state._timerId);
    state._remaining = state.lobby.timeMs;
    const timerEl = $("#timer");
    state._timerId = setInterval(()=>{
      if (state._qAdvanced) { clearInterval(state._timerId); return; }
      state._remaining -= 100;
      if (timerEl) timerEl.textContent = mmss(state._remaining);
      if (state._remaining <= 0){
        clearInterval(state._timerId);
        state.streak = 0;     // انتهى الوقت
        state._qAdvanced = true;
        setTimeout(nextStep, 10);
      }
    }, 100);
  }

  function nextStep(){
    if (state.questionIx < QUESTIONS.length - 1) {
      state.questionIx++; location.hash = "#/question";
    } else {
      location.hash = "#/results";
    }
  }

  function wireQuestion(){
    state._qAdvanced = false;
    startTimer();

    $$(".opt").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        if (state._qAdvanced) return;
        const ok = btn.dataset.ok === "1";
        $$(".opt").forEach(b=>b.disabled=true);
        btn.classList.add(ok ? "correct" : "wrong");
        $("#nextBtn").textContent = ok ? t("correct") : t("wrong");
        state._qAdvanced = true;

        // نقاط: أساس 100 عند الصح + بونص الوقت (كل ثانية متبقية ×5)
        if (ok){
          const timeBonus = Math.ceil(state._remaining/1000) * 5;
          state.score += 100 + timeBonus;
          state.streak += 1;
        } else {
          state.streak = 0;
        }

        setTimeout(nextStep, 700);
      });
    });

    // زر يدوي احتياطي
    $("#nextBtn")?.addEventListener("click", ()=>{
      if (!state._qAdvanced) { state.streak = 0; state._qAdvanced = true; }
      nextStep();
    });
  }

  // ===== Results =====
  function renderResults(){
    // مكافأة عملات = 10% من النقاط
    const coinsReward = Math.max(0, Math.round(state.score * 0.10));
    return wrapPhone(
      screen(t("resultsTitle"), `
        <div class="card"><strong>${t("score")}:</strong> ${state.score}</div>
        <div class="card"><strong>${t("streak")}:</strong> ${state.streak}</div>
        <div class="card"><strong>${t("reward")}:</strong> <span class="coin"></span> ${coinsReward}</div>
        <div class="row" style="margin-top:12px">
          <a class="btn cta" id="claimBtn" style="flex:1">${t("again")}</a>
          <a class="btn" href="#/modes" style="flex:1">${t("modesTitle")}</a>
        </div>
      `)
    );
  }
  function wireResults(){
    $("#claimBtn")?.addEventListener("click", ()=>{
      const coinsReward = Math.max(0, Math.round(state.score * 0.10));
      if (!state._awarded){
        state.wallet.coins += coinsReward; saveWallet(); state._awarded = true;
      }
      // جولة جديدة بنفس إعدادات اللوبي
      state.questionIx = 0; state.score = 0; state.streak = 0; state._qAdvanced = false;
      location.hash = "#/question";
    });
  }

  // ===== Customization / Store =====
  function previewSVG(){
    const eq = state.equipped;
    const cape = eq.cape ? `<path d="M30 110 L128 210 L226 110 Q200 120 128 120 Q56 120 30 110"
                  fill="#8b5cf6" opacity="0.55"/>` : "";
    const headband = eq.headband ? `<rect x="88" y="88" width="80" height="12" rx="5" fill="#e11d48"/>` : "";
    const visor = eq.visor ? `<rect x="92" y="120" width="72" height="10" rx="4" fill="#7c3aed" opacity="0.85"/>` : "";
    const scarf = eq.scarf ? `<path d="M90 154 Q128 170 166 154 L166 164 Q128 182 90 164 Z" fill="#14b8a6"/>` : "";
    const charm = eq.charm ? `<circle cx="128" cy="178" r="10" fill="#ffd166" stroke="#a66f00" stroke-width="3"/>` : "";

    return `
    <svg width="120" height="120" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd166"/><stop offset="1" stop-color="#ffb000"/></linearGradient></defs>
      ${cape}
      <path d="M48 96 h160 l-16 64 H64 Z" fill="url(#g2)" stroke="#a66f00" stroke-width="8"/>
      <path d="M40 88 q-28 6 -28 36 q0 28 28 36" fill="none" stroke="#ffb000" stroke-width="12" stroke-linecap="round"/>
      <path d="M216 88 q28 6 28 36 q0 28 -28 36" fill="none" stroke="#ffb000" stroke-width="12" stroke-linecap="round"/>
      ${headband}
      <ellipse cx="104" cy="132" rx="16" ry="12" fill="#fff" stroke="#2A2F45" stroke-width="3"/>
      <ellipse cx="152" cy="132" rx="16" ry="12" fill="#fff" stroke="#2A2F45" stroke-width="3"/>
      <circle cx="104" cy="132" r="6" fill="#2A2F45"/>
      <circle cx="152" cy="132" r="6" fill="#2A2F45"/>
      ${visor}
      <path d="M96 152 q32 18 64 0" fill="none" stroke="#2A2F45" stroke-width="5" stroke-linecap="round"/>
      ${scarf}
      <rect x="96" y="160" width="64" height="36" rx="6" fill="url(#g2)" stroke="#a66f00" stroke-width="6"/>
      ${charm}
      <rect x="64" y="200" width="128" height="28" rx="10" fill="url(#g2)" stroke="#a66f00" stroke-width="6"/>
    </svg>`;
  }

  function renderCustomization(){
    const c = state.content;
    const owned = new Set(state.owned);
    const char = c.characters[0];
    const outfits = c.cosmetics;

    const equippedBadges = Object.entries(state.equipped)
      .filter(([,id])=>!!id)
      .map(([slot,id])=>`<span class="badge">${slot}: ${id.replace(/_/g," ")}</span>`)
      .join(" ") || `<span class="badge">${t("nothingEquipped")}</span>`;

    const outfitCard = (o)=>{
      const isOwned = owned.has(o.id);
      const isEquipped = state.equipped[o.slot] === o.id;
      return `
        <div class="card store-item" style="width:100%">
          <div>
            <div><strong>${o.id.replace(/_/g," ")}</strong> <span class="badge">${o.slot}</span></div>
            <div class="price">${fmtPrice(o.price)}</div>
          </div>
          <div class="row">
            ${!isOwned
              ? `<button class="btn cta" data-buy="${o.id}">${t("buy")}</button>`
              : isEquipped
                ? `<span class="badge">${t("owned")}</span>
                   <button class="btn" data-unequip="${o.slot}">${t("unequip")}</button>`
                : `<span class="badge">${t("owned")}</span>
                   <button class="btn cta" data-equip="${o.id}" data-slot="${o.slot}">${t("equip")}</button>`}
          </div>
        </div>`;
    };

    return wrapPhone(
      screen(t("avatarTitle"), `
        <div class="card avatar" style="width:100%">
          <div class="preview">${previewSVG()}</div>
          <div>
            <div><strong>${(lang==="ar"?char.name_ar:char.name_en)} — ${char.default.colorway}</strong></div>
            <div class="row" style="margin-top:6px">${equippedBadges}</div>
          </div>
        </div>
        ${outfits.map(outfitCard).join("")}
        <div class="row" style="margin-top:12px">
          <div class="kbd" style="flex:1;text-align:center">${t("coins")}: ${state.wallet.coins}</div>
          <div class="kbd" style="flex:1;text-align:center">${t("gems")}: ${state.wallet.gems}</div>
        </div>
      `)
    );
  }

  function wireCustomization(){
    // شراء
    $$("[data-buy]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.dataset.buy;
        const item = state.content.cosmetics.find(x=>x.id===id);
        const price = item.price || {};
        if (price.coins && state.wallet.coins < price.coins) { alert(t("notEnough")); return; }
        if (price.gems  && state.wallet.gems  < price.gems ) { alert(t("notEnough")); return; }
        if (price.coins) state.wallet.coins -= price.coins;
        if (price.gems ) state.wallet.gems  -= price.gems;
        state.owned.push(id); saveOwned(); saveWallet(); render();
      });
    });
    // تجهيز
    $$("[data-equip]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.dataset.equip;
        const slot = btn.dataset.slot;
        state.equipped[slot] = id; saveEquipped(); render();
      });
    });
    // إزالة تجهيز
    $$("[data-unequip]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const slot = btn.dataset.unequip;
        state.equipped[slot] = null; saveEquipped(); render();
      });
    });
  }

  function renderStore(){
    const c = state.content;
    const items = [
      ...c.store.daily.map(id=>c.cosmetics.find(x=>x.id===id)),
      ...c.store.weekly.map(id=>c.cosmetics.find(x=>x.id===id))
    ].filter(Boolean);

    return wrapPhone(
      screen(t("storeTitle"),
        items.map(o=>`
          <div class="card store-item" style="width:100%">
            <div>
              <div><strong>${o.id.replace(/_/g," ")}</strong></div>
              <div class="price">${fmtPrice(o.price)}</div>
            </div>
            <a class="btn" href="#/customization">${t("equip")}</a>
          </div>`).join("")
      )
    );
  }

  // ===== main render =====
  async function render(){
    const app = $("#app");
    if (!state.content) await loadContent();
    clearInterval(state._timerId); // أوقف أي عدّاد سابق عند تغيير الشاشة
    let html = "";
    switch(state.route){
      case "splash":        html = renderSplash(); break;
      case "home":          html = renderHome(); break;
      case "modes":         html = renderModes(); break;
      case "lobby":         html = renderLobby(); break;
      case "question":      html = renderQuestion(); break;
      case "results":       html = renderResults(); break;
      case "customization": html = renderCustomization(); break;
      case "store":         html = renderStore(); break;
      default:              html = renderSplash();
    }
    app.innerHTML = html;
    if (state.route==="modes")        wireModes();
    if (state.route==="lobby")        wireLobby();
    if (state.route==="question")     wireQuestion();
    if (state.route==="results")      wireResults();
    if (state.route==="customization") wireCustomization();
    ensurePortraitOverlay();
  }

  // ===== boot =====
  $("#btnLang")?.addEventListener("click", ()=> setLang(lang==="ar"?"en":"ar"));
  $("#btnTheme")?.addEventListener("click", ()=> setTheme(theme==="dark"?"light":"dark"));
  setLang(lang); setTheme(theme);
  if(!location.hash) location.hash = "#/splash";
  render();
})();
