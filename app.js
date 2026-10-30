import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const fallbackServices = [
  ["security-assessment", "🛡️", "Cek Keamanan Website", "Audit keamanan website secara berizin."],
  ["wifi-audit", "📡", "Cek Keamanan WiFi", "Assessment jaringan WiFi milik klien dengan izin."],
  ["cctv-audit", "📹", "Cek Keamanan CCTV", "Audit konfigurasi dan keamanan CCTV milik klien."],
  ["mobile-security", "📱", "Mobile Security Testing", "Pengujian keamanan aplikasi secara berizin."],
  ["wa-security", "💬", "WhatsApp Security", "Bantuan keamanan akun dan pengaturan privasi."],
  ["link-security", "🔗", "Link Security Assessment", "Pemeriksaan keamanan URL dan domain."],
  ["social-boost", "📈", "Boosting All Medsos", "Layanan digital marketing."],
  ["private-training", "🎓", "Private Ethical Hacking", "Belajar keamanan siber secara legal."],
  ["osint-audit", "🔎", "OSINT & Exposure Check", "Pemeriksaan exposure informasi yang sah."],
  ["custom-development", "🧩", "Custom Security Tool / Script", "Pembuatan tools untuk kebutuhan defensif."]
].map(([id, icon, name, description]) => ({
  id, icon, name, description, active: true
}));

const fallbackPackages = [];
const prices = [80000, 160000, 320000, 400000, 480000, 560000, 640000, 720000, 800000, 880000];
const quantities = ["1K", "2K", "3K", "4K", "5K", "6K", "7K", "8K", "9K", "10K"];

quantities.forEach((qty, i) => {
  ["instagram", "tiktok"].forEach(platform => {
    fallbackPackages.push({
      id: `${platform}-${qty}`,
      platform,
      qty,
      price: prices[i],
      guarantee: i === 9 ? "30 hari" : "7 hari"
    });
  });
});

const fallbackSite = {
  brandName: "KENSEONN",
  heroTitle: "Security, Digital Growth & IT Service.",
  heroText: "Layanan digital profesional dengan proses berbasis izin dan kesepakatan.",
  aboutName: "Kenseonn Ethical Hacking",
  aboutBio: "Fokus pada security testing yang legal, terukur, dan berizin.",
  email: "kendevelopersecurity@gmail.com",
  instagram: "kenseonn",
  whatsapp: "62895636069948",
  experience: "4+ years learning & building"
};

let services = fallbackServices;
let packages = fallbackPackages;
let site = { ...fallbackSite };

const byId = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("id-ID").format(Number(n) || 0);

function esc(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showOrderStatus(message, success = false) {
  const el = byId("orderStatus");
  if (!el) return;
  el.textContent = message;
  el.setAttribute("role", "status");
  el.style.color = success ? "#86ffad" : "#ffb4b4";
}


// Appearance/social controls are intentionally browser-local.
// This avoids adding Firestore collections or changing existing security rules.
const LOCAL_DESIGN_KEY = "kenseonn.design.v1";
const LOCAL_SOCIAL_KEY = "kenseonn.social.v1";
const defaultDesign = {accent:"#7cf29a",accent2:"#63a7ff",bg:"#06080d",panel:"#0c1119",effect:"cyber",animation:"on",intensity:"medium",particles:true};
const socialLabels = {instagram:"Instagram",tiktok:"TikTok",facebook:"Facebook",youtube:"YouTube",telegram:"Telegram",whatsapp:"WhatsApp",discord:"Discord",github:"GitHub",x:"X / Twitter",linkedin:"LinkedIn"};
function readLocal(key, fallback){try{return {...fallback,...JSON.parse(localStorage.getItem(key)||"{}")}}catch{return {...fallback}}}
function safeSocialUrl(value){
  try{const u=new URL(value);return ["https:","http:"].includes(u.protocol)?u.href:""}catch{return ""}
}
let fxFrame = 0;
function applyLocalDesign(){
  const d={...defaultDesign,...(site.design||{})}, root=document.documentElement;
  root.style.setProperty("--accent",d.accent);root.style.setProperty("--accent2",d.accent2);
  root.style.setProperty("--bg",d.bg);root.style.setProperty("--panel",d.panel);
  document.body.classList.toggle("animations-off",d.animation==="off");
  document.body.classList.toggle("hide-grid",d.grid===false);
  document.body.classList.toggle("hide-scanline",d.scanline===false);
  document.body.classList.toggle("no-glow",d.glow===false);
  const logo=document.querySelector(".brand-mark");
  if(logo && d.logoText){logo.textContent=d.logoText;logo.classList.add("text-logo")}
  const badge=byId("heroBadgeText");if(badge && d.heroBadge)badge.textContent=d.heroBadge;
  document.body.classList.remove("fx-neon","fx-matrix","fx-minimal","fx-stars","fx-snow","fx-particles","intensity-low","intensity-high");
  if(d.effect==="neon")document.body.classList.add("fx-neon");
  if(d.effect==="matrix")document.body.classList.add("fx-matrix");
  if(d.effect==="minimal")document.body.classList.add("fx-minimal");
  if(d.effect==="stars")document.body.classList.add("fx-stars");
  if(d.effect==="snow")document.body.classList.add("fx-snow");
  if(d.effect==="particles")document.body.classList.add("fx-particles");
  document.body.classList.add("intensity-"+(d.intensity||"medium"));
  startFxCanvas(d);
}
function startFxCanvas(d){
  const canvas=byId("fxCanvas");if(!canvas)return;
  cancelAnimationFrame(fxFrame);
  const ctx=canvas.getContext("2d");let w=0,h=0,items=[];
  const resize=()=>{w=canvas.width=innerWidth*devicePixelRatio;h=canvas.height=innerHeight*devicePixelRatio;canvas.style.width=innerWidth+"px";canvas.style.height=innerHeight+"px";ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);w=innerWidth;h=innerHeight;};
  resize();addEventListener("resize",resize,{passive:true});
  const type=d.effect||"matrix",count=Math.max(10,Math.min(180,Number(d.density)||60)),speed=Math.max(1,Math.min(10,Number(d.speed)||5));
  const symbols="アイウエオカキクケコサシスセソタチツテト0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  items=Array.from({length:count},()=>({x:Math.random()*w,y:Math.random()*h,v:.3+Math.random()*speed*.45,r:Math.random()*2+0.5,char:symbols[Math.floor(Math.random()*symbols.length)],alpha:.15+Math.random()*.7}));
  const draw=()=>{
    if(d.animation==="off"||type==="minimal"||type==="cyber"){ctx.clearRect(0,0,w,h);return;}
    ctx.clearRect(0,0,w,h);
    for(const p of items){
      ctx.globalAlpha=p.alpha;
      if(type==="matrix"){ctx.fillStyle=d.accent||"#00ff88";ctx.font="14px monospace";ctx.fillText(p.char,p.x,p.y);p.y+=p.v*speed*.7;if(p.y>h+20){p.y=-20;p.x=Math.random()*w}}
      else {ctx.fillStyle=type==="snow"?"#e8f7ff":(d.accent2||"#9bdcff");ctx.beginPath();ctx.arc(p.x,p.y,p.r*(type==="stars"?1.2:1),0,Math.PI*2);ctx.fill();p.y+=p.v*(type==="snow"?speed*.45:speed*.18);p.x+=Math.sin(p.y*.01)*.35;if(p.y>h+8){p.y=-8;p.x=Math.random()*w}}
    }
    ctx.globalAlpha=1;fxFrame=requestAnimationFrame(draw);
  };
  if(!matchMedia("(prefers-reduced-motion: reduce)").matches)draw();
}
function renderSocialLinks(){
  const holder=byId("socialLinks");if(!holder)return;
  const social={instagram:site.instagram?`https://instagram.com/${site.instagram}`:"",whatsapp:site.whatsapp?`https://wa.me/${String(site.whatsapp).replace(/\D/g,"")}`:"",...(site.social||readLocal(LOCAL_SOCIAL_KEY,{}))};
  holder.innerHTML=Object.entries(socialLabels).map(([key,label])=>{const url=safeSocialUrl(social[key]||"");return url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${label} ↗</a>`:""}).join("");
}

async function loadData() {
  try {
    const [serviceSnap, packageSnap, siteSnap] = await Promise.all([
      getDocs(collection(db, "services")),
      getDocs(collection(db, "packages")),
      getDoc(doc(db, "siteConfig", "main"))
    ]);

    if (!serviceSnap.empty) {
      services = serviceSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.active !== false);
    }

    if (!packageSnap.empty) {
      packages = packageSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
    }

    if (siteSnap.exists()) {
      site = { ...fallbackSite, ...siteSnap.data() };
    }
  } catch (err) {
    console.error("Gagal memuat data website:", err);
    showOrderStatus(
      "Info: data online belum berhasil dimuat. Katalog bawaan ditampilkan."
    );
  }

  render();
  // Apply saved Design Studio and Social Media settings after Firestore data is loaded.
  applyLocalDesign();
  renderSocialLinks();
}

function render() {
  applyMaintenance();

  document.title = `${site.brandName || "KENSEONN"} — Digital IT Service`;

  const textFields = {
    brandName: site.brandName || "KENSEONN",
    heroTitle: site.heroTitle || "",
    heroText: site.heroText || "",
    aboutName: site.aboutName || "",
    aboutBio: site.aboutBio || "",
    terminalName: site.aboutName || "",
    terminalExp: site.experience || "",
    serviceCount: services.length,
    year: new Date().getFullYear()
  };

  Object.entries(textFields).forEach(([id, value]) => {
    const el = byId(id);
    if (el) el.textContent = value;
  });

  const email = byId("emailLink");
  if (email) {
    email.textContent = site.email || "";
    email.href = `mailto:${site.email || ""}`;
  }

  const instagram = byId("igLink");
  if (instagram) {
    instagram.textContent = `@${site.instagram || ""}`;
    instagram.href = `https://instagram.com/${encodeURIComponent(site.instagram || "")}`;
  }

  const whatsapp = byId("waLink");
  if (whatsapp) {
    whatsapp.href = `https://wa.me/${String(site.whatsapp || "").replace(/\D/g, "")}`;
  }

  const servicesGrid = byId("servicesGrid");
  if (servicesGrid) {
    servicesGrid.innerHTML = services.map(s => `
      <article class="service-card">
        <div class="service-icon">${esc(s.icon || "⚡")}</div>
        <h3>${esc(s.name)}</h3>
        <p>${esc(s.description)}</p>
        <button type="button" class="btn small order-service"
          data-service="${esc(s.name)}">
          Order layanan →
        </button>
      </article>
    `).join("");
  }

  const serviceSelect = byId("serviceSelect");
  if (serviceSelect) {
    const previousValue = serviceSelect.value;
    serviceSelect.innerHTML = services.map(s => `
      <option value="${esc(s.name)}">${esc(s.name)}</option>
    `).join("");

    if ([...serviceSelect.options].some(o => o.value === previousValue)) {
      serviceSelect.value = previousValue;
    }
  }

  renderPlatformTabs();
}

function renderPackages(platform) {
  const grid = byId("packagesGrid");
  if (!grid) return;

  const list = packages
    .filter(p => p.platform === platform)
    .sort((a, b) => (parseInt(a.qty, 10) || 0) - (parseInt(b.qty, 10) || 0));

  grid.innerHTML = list.map(p => `
    <article class="price-card ${p.qty === "10K" ? "featured" : ""}">
      ${p.qty === "10K" ? '<span class="popular">BEST VALUE</span>' : ""}
      <span class="price-platform">${esc(platform.toUpperCase())}</span>
      <h3>${esc(p.qty)} Followers</h3>
      <div class="price">Rp ${money(p.price)}</div>
      <div class="guarantee">Garansi ${esc(p.guarantee || "sesuai kesepakatan")}</div>
      <button type="button" class="btn primary full order-package"
        data-service="${esc(`${platform} ${p.qty} Followers — Rp ${p.price}`)}">
        Order Paket
      </button>
    </article>
  `).join("");
}

function applyMaintenance() {
  const screen = byId("maintenanceScreen");
  if (!screen) return;

  const enabled = site.maintenanceEnabled === true;

  if (!enabled) {
    screen.classList.add("hidden");
    document.body.classList.remove("maintenance-active");
    return;
  }

  screen.classList.remove("hidden");
  document.body.classList.add("maintenance-active");

  const title = byId("maintenanceTitle");
  const message = byId("maintenanceMessage");
  const status = byId("maintenanceStatus");
  const wa = byId("maintenanceWa");
  const ig = byId("maintenanceIg");

  if (title) title.textContent = site.maintenanceTitle || "Website sedang maintenance";
  if (message) message.textContent = site.maintenanceMessage || "Silakan kembali beberapa saat lagi.";
  if (status) status.textContent = site.maintenanceStatus || "MAINTENANCE";

  if (wa) wa.href = `https://wa.me/${String(site.whatsapp || "").replace(/\D/g, "")}`;
  if (ig) ig.href = `https://instagram.com/${encodeURIComponent(site.instagram || "")}`;

  startCountdown(site.maintenanceUntil);
}

let countdownTimer;

function startCountdown(until) {
  clearInterval(countdownTimer);

  const el = byId("countdown");
  if (!el) return;

  if (!until) {
    el.textContent = "MAINTENANCE";
    return;
  }

  const target = new Date(until).getTime();

  if (!Number.isFinite(target)) {
    el.textContent = "MAINTENANCE";
    return;
  }

  const tick = () => {
    const diff = target - Date.now();

    if (diff <= 0) {
      el.textContent = "00:00:00";
      clearInterval(countdownTimer);
      return;
    }

    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    el.textContent = [hours, minutes, seconds]
      .map(n => String(n).padStart(2, "0"))
      .join(":");
  };

  tick();
  countdownTimer = setInterval(tick, 1000);
}

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
    button.classList.add("active");
    renderPackages(button.dataset.platform);
  });
});

document.addEventListener("click", event => {
  const button = event.target.closest(".order-service, .order-package");
  if (!button) return;

  const select = byId("serviceSelect");
  const form = byId("orderForm");
  if (!select || !form) return;

  const requested = button.dataset.service || "";

  if (![...select.options].some(option => option.value === requested)) {
    const option = document.createElement("option");
    option.value = requested;
    option.textContent = requested;
    select.appendChild(option);
  }

  select.value = requested;
  location.hash = "order";
  form.scrollIntoView({ behavior: "smooth", block: "center" });
});

const orderForm = byId("orderForm");

if (orderForm) {
  orderForm.addEventListener("submit", async event => {
    event.preventDefault();

    const form = event.currentTarget;
    const submitButton = form.querySelector('[type="submit"]');

    if (!form.reportValidity()) return;

    const fields = new FormData(form);

    const name = String(fields.get("name") || "").trim();
    const phone = String(fields.get("phone") || "").trim();
    const email = String(fields.get("email") || "").trim();
    const service = String(fields.get("service") || "").trim();
    const details = String(fields.get("details") || "").trim();

    if (!name || !phone || !service || !details) {
      showOrderStatus("Lengkapi nama, WhatsApp, layanan, dan detail kebutuhan.");
      return;
    }

    const consent = form.querySelector('[type="checkbox"]');
    if (consent && !consent.checked) {
      showOrderStatus("Centang persetujuan izin sebelum mengirim order.");
      return;
    }

    const data = {
      name,
      phone,
      email,
      service,
      details,
      status: "new",
      createdAt: serverTimestamp()
    };

    try {
      showOrderStatus("Mengirim order…");
      if (submitButton) submitButton.disabled = true;

      await addDoc(collection(db, "orders"), data);

      showOrderStatus(
        "Order berhasil dikirim. Admin akan menghubungi Anda.",
        true
      );
      form.reset();
    } catch (err) {
      console.error("Gagal mengirim order:", err);

      const code = err?.code || "unknown";
      showOrderStatus(`Order gagal (${code}). Periksa Firebase Rules dan konfigurasi.`);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });
}

loadData();

window.addEventListener("storage", event => { if([LOCAL_DESIGN_KEY,LOCAL_SOCIAL_KEY].includes(event.key)){applyLocalDesign();renderSocialLinks();} });
