/* Roundo – Portrait-first SPA: AR/EN + Light/Dark + Hash routing + Store/Customization + Auto-advance Q */
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
        nothingEquipped:"لا شيء مجهّز", players:"اللاعبون", rotate:"فضلاً استخدم الجهاز بوضع الطول"},
    en:{app:"Roundo",badge:"Prototype",home:"Home",modes:"Game Modes",lobby:"Lobby",store:"Store",
        splashTitle:"Splash",quickPlay:"Quick Play",playNow:"Play Now",
        modesTitle:"Game Modes",lobbyTitle:"Lobby",storeTitle:"Store",avatarTitle:"My Avatar",
        questionTitle:"Question",resultsTitle:"Results",abilities:"Abilities",traps:"Traps",progress:"Progress",
        owned:"Owned",buy:"Buy",equip:"Equip",unequip:"Unequip",coins:"Coin",gems:"Gem",
        free:"Free",inProgress:"Coming soon",notEnough:"Not enough coins",
        correct:"Correct!",wrong:"Wrong",next:"Next",again:"Play Again",
        nothingEquipped:"Nothing equipped", players:"Players", rotate:"Please use portrait orientation"}
  };

  // ===== utils / state =====
  const $ = (s, r=document)=>r.querySelector(s);
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
    questionIx: 0,
  };

  const t = (k)=>STR[lang][k] || k;

  const setLang = (l)=>{
    lang=l; localStorage.setItem("roundo_lang",l);
    document.documentElement.lang=l; document.documentElement.dir=(l==="ar"?"rtl":"ltr");
    $("#t_app").textContent=t("app"); $("#t_badge").textContent=STR[lang].badge;
    $("#t_home").textContent=t("home"); $("#t_modes").textContent=t("modes");
    $("#t_lobby").textContent=t("lobby"); $("#t_store").textContent=t("store");
    $("#btnLang").textContent=(l==="ar"?"EN":"AR");
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
      overlay.style.cssText = `
        position:fixed;inset:0;display:none;align-items:center;justify-content:center;
        background:rgba(0,0,0,.7);color:#fff;font:600 18px system-ui;z-index:9999;text-align:center;padding:20px;
      `;
      overlay.innerHTML = `<div style="max-width:420px">
        <div style="font-size:40px;line-height:1">🔄</div>
        <div style="margin-top:8px">${t("rotate")}</div>
      </div>`;
      document.body.appendChild(overlay);
    }
    overlay.style.display = portrait ? "none" : "flex";
  }
  window.addEventListener("resize", ensurePortraitOverlay);
  window.addEventListener("orientationchange", ensurePortraitOverlay);

  // ===== view helpers =====
  // حاوية تضبط العرض للطول (عرض هاتف) وتكدس كل شيء عمودي
  const wrapPhone = (inner)=>`
    <div style="width:min(420px,94vw);margin:12px auto;display:flex;flex-direction:column;gap:12px">
      ${inner}
    </div>`;

  const screen = (title, body)=>`
    <section class="card" style="width:100%">
      <div class="h1">${title}</div>
      ${body}
    </section>`;

  function renderSplash(){
    return wrapPhone(
      screen(t("splashTitle"), `
        <div class="row"><div class="kbd">${t("quickPlay")}</div><a class="btn cta" href="#/home" style="flex:1">${t("playNow")}</a></div>
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
        <a class="btn" href="#/question" style="width:100%;margin-top:6px">${t("questionTitle")}</a>
      `)
    );
  }

  function renderModes(){
    const list = ["Quick Match","Story Adventure","Head-to-Head","Treasure Race","Knowledge Bomb","Tournaments"];
    return wrapPhone(
      screen(t("modesTitle"),
        list.map(s=>`<div class="card" style="margin-top:8px"><div class="row"><span class="badge">Mode</span><strong>${s}</strong></div><small class="muted">${t("inProgress")}</small></div>`).join("")
      )
    );
  }

  function renderLobby(){
    return wrapPhone(
      screen(t("lobbyTitle"), `
        <div class="card">
          <div class="h2">${t("players")}</div>
          <div class="row"><span class="badge">You</span><span class="badge">Friend#219</span><span class="badge">Friend#852</span></div>
        </div>
        <a class="btn cta" href="#/question" style="width:100%;margin-top:8px">${t("playNow")}</a>
      `)
    );
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

  function renderQuestion(){
    const q = QUESTIONS[state.questionIx];
    const prompt = (lang==="ar")? q.prompt_ar : q.prompt_en;
    const opts = q.answers.map((a,i)=>({txt:(lang==="ar"?a.ar:a.en), ok:!!a.correct, i}));
    return wrapPhone(
      screen(t("questionTitle"), `
        <div class="h2" style="margin-bottom:8px">${prompt}</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${opts.map(o=>`<button class="opt btn" style="width:100%;text-align:start" data-ix="${o.i}" data-ok="${o.ok?'1':'0'}">${o.txt}</button>`).join("")}
        </div>
        <div class="meta" style="margin-top:10px">
          <span class="badge">Round ${state.questionIx+1}/${QUESTIONS.length}</span>
          <span class="badge">00:22</span>
        </div>
        <button class="btn" id="nextBtn" style="width:100%;margin-top:8px">${t("next")}</button>
      `)
    );
  }

  function wireQuestion(){
    let advanced = false;
    $$(".opt").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        if (advanced) return;
        const ok = btn.dataset.ok === "1";
        $$(".opt").forEach(b=>b.disabled=true);
        btn.classList.add(ok ? "correct" : "wrong");
        $("#nextBtn").textContent = ok ? t("correct") : t("wrong");
        advanced = true;

        setTimeout(()=>{
          if (state.questionIx < QUESTIONS.length - 1) {
            state.questionIx++; location.hash = "#/question";
          } else {
            location.hash = "#/results";
          }
        }, 700);
      });
    });

    // زر يدوي احتياطي
    $("#nextBtn")?.addEventListener("click", ()=>{
      if (state.questionIx < QUESTIONS.length - 1) {
        state.questionIx++; location.hash = "#/question";
      } else {
        location.hash = "#/results";
      }
    });
  }

  function renderResults(){
    return wrapPhone(
      screen(t("resultsTitle"), `
        <div class="card"><strong>Rank #1</strong><div class="badge">+120 XP</div></div>
        <div class="card"><strong>Rank #2</strong><div class="badge">+90 XP</div></div>
        <div class="card"><strong>Rank #3</strong><div class="badge">+40 XP</div></div>
        <div class="row" style="margin-top:12px">
          <a class="btn cta" href="#/question" style="flex:1">${t("again")}</a>
          <a class="btn" href="#/home" style="flex:1">${t("home")}</a>
        </div>
      `)
    );
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
    if (state.route==="question")      wireQuestion();
    if (state.route==="customization") wireCustomization();
    ensurePortraitOverlay();
  }

  // ===== boot =====
  $("#btnLang").addEventListener("click", ()=> setLang(lang==="ar"?"en":"ar"));
  $("#btnTheme").addEventListener("click", ()=> setTheme(theme==="dark"?"light":"dark"));
  setLang(lang); setTheme(theme);
  if(!location.hash) location.hash = "#/splash";
  render();
})();
