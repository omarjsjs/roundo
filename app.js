/* Roundo – minimal SPA, AR/EN + Light/Dark + Hash routing + Customization/Store + Sample Question */
(() => {
  // ---- Localization
  const STR = {
    ar: {
      app: "راوندو", badge:"نموذج",
      home:"الرئيسية", modes:"أنماط اللعب", lobby:"اللوبي", store:"المتجر",
      splashTitle:"الشاشة الافتتاحية", quickPlay:"مباراة سريعة", playNow:"ابدأ الآن",
      modesTitle:"أنماط اللعب", lobbyTitle:"اللوبي", storeTitle:"المتجر", avatarTitle:"شخصيتي",
      questionTitle:"السؤال", resultsTitle:"النتائج",
      abilities:"القدرات", traps:"الفخاخ", progress:"التقدم",
      owned:"مملوك", buy:"شراء", equip:"تجهيز",
      coins:"عملة", gems:"جوهرة", free:"مجاني",
      inProgress:"قريبًا", notEnough:"لا توجد عملات كافية",
      correct:"إجابة صحيحة!", wrong:"إجابة خاطئة", next:"التالي", again:"العب مجددًا",
      hint:"نموذج أولي — AR/EN + فاتح/داكن + تنقّل هاش + تخصيص ومتجر"
    },
    en: {
      app:"Roundo", badge:"Prototype",
      home:"Home", modes:"Game Modes", lobby:"Lobby", store:"Store",
      splashTitle:"Splash", quickPlay:"Quick Play", playNow:"Play Now",
      modesTitle:"Game Modes", lobbyTitle:"Lobby", storeTitle:"Store", avatarTitle:"My Avatar",
      questionTitle:"Question", resultsTitle:"Results",
      abilities:"Abilities", traps:"Traps", progress:"Progress",
      owned:"Owned", buy:"Buy", equip:"Equip",
      coins:"Coin", gems:"Gem", free:"Free",
      inProgress:"Coming soon", notEnough:"Not enough coins",
      correct:"Correct!", wrong:"Wrong", next:"Next", again:"Play Again",
      hint:"Prototype — AR/EN + Light/Dark + Hash routing + Customization & Store"
    }
  };

  let lang = (localStorage.getItem("roundo_lang") || "ar");
  let theme = (localStorage.getItem("roundo_theme") || "dark");
  let state = {
    route: location.hash.replace("#/","") || "splash",
    wallet: JSON.parse(localStorage.getItem("roundo_wallet") || '{"coins":2000,"gems":150}'),
    owned: JSON.parse(localStorage.getItem("roundo_owned") || "[]"),
    content: null,
    questionIx: 0,
  };

  // ---- Utilities
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const t = (k) => STR[lang][k] ?? k;
  const setLang = (l) => {
    lang = l; localStorage.setItem("roundo_lang", l);
    document.documentElement.lang = l; document.documentElement.dir = (l==="ar"?"rtl":"ltr");
    // header labels
    $("#t_app").textContent = t("app");
    $("#t_badge").textContent = t("badge");
    $("#t_home").textContent = t("home");
    $("#t_modes").textContent = t("modes");
    $("#t_lobby").textContent = t("lobby");
    $("#t_store").textContent = t("store");
    $("#t_hint").textContent = t("hint");
    $("#btnLang").textContent = (l==="ar" ? "EN" : "AR");
    render(); // re-render current route
  };
  const setTheme = (m) => {
    theme = m; localStorage.setItem("roundo_theme", m);
    document.body.classList.toggle("theme-light", theme==="light");
  };
  const fmtPrice = (p) => {
    if(!p) return t("free");
    if(p.coins) return `${p.coins} ${t("coins")}`;
    if(p.gems) return `${p.gems} ${t("gems")}`;
    return t("free");
  };
  const saveOwned = () => localStorage.setItem("roundo_owned", JSON.stringify(state.owned));
  const saveWallet = () => localStorage.setItem("roundo_wallet", JSON.stringify(state.wallet));

  // ---- Routing
  window.addEventListener("hashchange", ()=>{ state.route = location.hash.replace("#/","") || "splash"; render(); });

  // ---- Content (cosmetics/store)
  async function loadContent(){
    if(state.content) return;
    const res = await fetch("content.json"); // same-origin on GitHub Pages
    state.content = await res.json();
  }

  // ---- Renderers
  function screen(title, bodyHTML){
    return `
      <section class="card">
        <div class="h1">${title}</div>
        ${bodyHTML}
      </section>
    `;
  }

  function renderSplash(){
    return screen(t("splashTitle"), `
      <div class="row">
        <div class="kbd">${t("quickPlay")}</div>
        <a class="btn cta" href="#/home">${t("playNow")}</a>
      </div>
      <div class="grid cols-3" style="margin-top:12px">
        <div class="card"><div class="h2">${t("abilities")}</div><div class="badge">Hint / Freeze / Shield</div></div>
        <div class="card"><div class="h2">${t("traps")}</div><div class="badge">Scramble / Fog</div></div>
        <div class="card"><div class="h2">${t("progress")}</div><div class="badge">Treasure Map</div></div>
      </div>
    `);
  }

  function renderHome(){
    return screen(t("home"), `
      <div class="grid cols-2">
        <div class="card">
          <div class="h2">${t("modesTitle")}</div>
          <div class="row"><a class="btn" href="#/modes">${t("modes")}</a></div>
        </div>
        <div class="card">
          <div class="h2">${t("avatarTitle")}</div>
          <div class="row"><a class="btn" href="#/customization">${t("avatarTitle")}</a></div>
        </div>
        <div class="card">
          <div class="h2">${t("storeTitle")}</div>
          <div class="row"><a class="btn" href="#/store">${t("store")}</a></div>
        </div>
        <div class="card">
          <div class="h2">${t("questionTitle")}</div>
          <div class="row"><a class="btn" href="#/question">${t("questionTitle")}</a></div>
        </div>
      </div>
    `);
  }

  function renderModes(){
    const list = ["Quick Match","Story Adventure","Head-to-Head","Treasure Race","Knowledge Bomb","Tournaments"];
    return screen(t("modesTitle"),
      `<div class="grid cols-2">`+
      list.map(s=>`<div class="card"><div class="row"><span class="badge">Mode</span><strong>${s}</strong></div><small class="muted">${t("inProgress")}</small></div>`).join("")+
      `</div>`
    );
  }

  function renderLobby(){
    return screen(t("lobbyTitle"), `
      <div class="card">
        <div class="h2">Players</div>
        <div class="row"><span class="badge">You</span><span class="badge">Friend#219</span><span class="badge">Friend#852</span></div>
      </div>
      <div class="row" style="margin-top:12px">
        <a class="btn cta" href="#/question">${t("playNow")}</a>
      </div>
    `);
  }

  // Sample question
  const QUESTIONS = [{
    id:1,
    prompt_ar:"ما عاصمة فرنسا؟",
    prompt_en:"What is the capital of France?",
    answers:[
      {ar:"باريس", en:"Paris", correct:true},
      {ar:"روما",  en:"Rome"},
      {ar:"مدريد",en:"Madrid"},
      {ar:"برلين",en:"Berlin"}
    ]
  }];

  function renderQuestion(){
    const q = QUESTIONS[state.questionIx % QUESTIONS.length];
    const prompt = (lang==="ar") ? q.prompt_ar : q.prompt_en;
    const opts = q.answers.map((a,i)=>({txt:(lang==="ar"?a.ar:a.en), correct:!!a.correct, i}));
    return screen(t("questionTitle"), `
      <div class="card">
        <div class="h2">${prompt}</div>
        <div class="options">
          ${opts.map(o=>`<button class="opt" data-ix="${o.i}" data-ok="${o.correct?'1':'0'}">${o.txt}</button>`).join("")}
        </div>
        <div class="meta"><span class="badge">Round 1/6</span><span class="badge">00:22</span></div>
        <div class="row">
          <button class="btn" id="nextBtn">${t("next")}</button>
        </div>
      </div>
    `);
  }

  function wireQuestion(){
    $$(".opt").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const ok = btn.dataset.ok === "1";
        $$(".opt").forEach(b=>b.disabled=true);
        btn.classList.add(ok?"correct":"wrong");
        $("#nextBtn").textContent = ok ? t("correct") : t("wrong");
      });
    });
    $("#nextBtn")?.addEventListener("click", ()=>{
      state.questionIx++;
      location.hash = "#/results";
    });
  }

  function renderResults(){
    return screen(t("resultsTitle"), `
      <div class="grid cols-3">
        <div class="card"><strong>Rank #1</strong><div class="badge">+120 XP</div></div>
        <div class="card"><strong>Rank #2</strong><div class="badge">+90 XP</div></div>
        <div class="card"><strong>Rank #3</strong><div class="badge">+40 XP</div></div>
      </div>
      <div class="row" style="margin-top:12px">
        <a class="btn cta" href="#/question">${t("again")}</a>
        <a class="btn" href="#/home">${t("home")}</a>
      </div>
    `);
  }

  function renderCustomization(){
    const c = state.content;
    const owned = new Set(state.owned);
    const char = c.characters[0]; // trophy
    const outfits = c.cosmetics;

    const outfitCard = (o)=>`
      <div class="card store-item">
        <div>
          <div><strong>${o.id.replace(/_/g," ")}</strong></div>
          <div class="price">
            ${o.price?.coins? `<span class="coin"></span>${o.price.coins}` : o.price?.gems? `<span class="gem"></span>${o.price.gems}`:`${t("free")}`}
          </div>
        </div>
        <div class="row">
          ${owned.has(o.id) ? `<span class="badge">${t("owned")}</span><button class="btn">${t("equip")}</button>`
                             : `<button class="btn cta" data-buy="${o.id}">${t("buy")}</button>`}
        </div>
      </div>`;

    return screen(t("avatarTitle"), `
      <div class="avatar card">
        <div class="preview"><img src="assets/mascot.svg" alt="Trophy" width="80"/></div>
        <div>
          <div><strong>${(lang==="ar"?char.name_ar:char.name_en)} — ${char.default.colorway}</strong></div>
          <div class="badge">${(lang==="ar"?"تعابير":"Expressions")}: ${char.expressions.join(", ")}</div>
        </div>
      </div>
      <div class="h2" style="margin-top:12px">${t("storeTitle")}</div>
      <div class="grid cols-2">
        ${outfits.map(outfitCard).join("")}
      </div>
      <div class="row" style="margin-top:12px">
        <div class="kbd">${t("coins")}: ${state.wallet.coins}</div>
        <div class="kbd">${t("gems")}: ${state.wallet.gems}</div>
      </div>
    `);
  }

  function wireCustomization(){
    $$("[data-buy]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const id = btn.dataset.buy;
        const item = state.content.cosmetics.find(x=>x.id===id);
        const price = item.price || {};
        if(price.coins && state.wallet.coins < price.coins){
          alert(t("notEnough")); return;
        }
        if(price.gems && state.wallet.gems < price.gems){
          alert(t("notEnough")); return;
        }
        if(price.coins) state.wallet.coins -= price.coins;
        if(price.gems) state.wallet.gems -= price.gems;
        state.owned.push(id); saveOwned(); saveWallet();
        render(); // re-render to reflect ownership
      });
    });
  }

  function renderStore(){
    const c = state.content;
    const items = [
      ...c.store.daily.map(id=>c.cosmetics.find(x=>x.id===id)),
      ...c.store.weekly.map(id=>c.cosmetics.find(x=>x.id===id))
    ].filter(Boolean);

    return screen(t("storeTitle"),
      `<div class="grid cols-2">`+
      items.map(o=>`
        <div class="card store-item">
          <div>
            <div><strong>${o.id.replace(/_/g," ")}</strong></div>
            <div class="price">${fmtPrice(o.price)}</div>
          </div>
          <a class="btn" href="#/customization">${t("equip")}</a>
        </div>
      `).join("")+
      `</div>`
    );
  }

  // ---- Main render
  async function render(){
    const app = $("#app");
    const r = state.route;
    if(!state.content) await loadContent();

    let html="";
    switch(r){
      case "splash": html = renderSplash(); break;
      case "home": html = renderHome(); break;
      case "modes": html = renderModes(); break;
      case "lobby": html = renderLobby(); break;
      case "question": html = renderQuestion(); break;
      case "results": html = renderResults(); break;
      case "customization": html = renderCustomization(); break;
      case "store": html = renderStore(); break;
      default: html = renderSplash();
    }
    app.innerHTML = html;

    // wire after render
    if(r==="question") wireQuestion();
    if(r==="customization") wireCustomization();
  }

  // ---- Boot
  $("#btnLang").addEventListener("click", ()=> setLang(lang==="ar"?"en":"ar"));
  $("#btnTheme").addEventListener("click", ()=> setTheme(theme==="dark"?"light":"dark"));
  setLang(lang); setTheme(theme);
  if(!location.hash) location.hash = "#/splash";
  render();
})();