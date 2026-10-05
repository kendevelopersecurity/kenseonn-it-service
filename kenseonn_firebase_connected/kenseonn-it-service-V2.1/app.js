import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, addDoc, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const fallbackServices = [
  ["security-assessment","🛡️","Cek Keamanan Website","Audit keamanan website secara authorized: konfigurasi, exposure, dan rekomendasi perbaikan."],
  ["wifi-audit","📡","Cek Keamanan WiFi","Assessment keamanan jaringan WiFi milik klien dengan scope dan izin yang jelas."],
  ["cctv-audit","📹","Cek Keamanan CCTV","Audit konfigurasi dan exposure CCTV/IP camera milik klien. Tidak untuk mengambil alih perangkat tanpa izin."],
  ["mobile-security","📱","Mobile Security Testing","Pengujian keamanan aplikasi/perangkat Android/iOS milik klien secara berizin."],
  ["wa-security","💬","WhatsApp Security & Troubleshooting","Bantuan keamanan akun, recovery guidance, konfigurasi privasi, dan troubleshooting yang legal."],
  ["link-security","🔗","Link Security Assessment","Pemeriksaan keamanan URL/domain dan simulasi awareness/phishing yang hanya dilakukan dengan izin."],
  ["social-boost","📈","Boosting All Medsos","Layanan digital marketing untuk Instagram, TikTok, YouTube, Facebook, X/Twitter dan traffic website."],
  ["private-training","🎓","Private Ethical Hacking","Belajar security testing, networking, web security, dan penggunaan tools secara legal."],
  ["osint-audit","🔎","OSINT & Exposure Check","Pemeriksaan jejak digital/exposure informasi yang dilakukan pada target yang sah dan berizin."],
  ["custom-development","🧩","Custom Security Tool / Script","Development tool untuk kebutuhan defensive, automation, monitoring, dan security testing yang legal."]
].map(([id,icon,name,description])=>({id,name,icon,description,active:true}));

const fallbackPackages = [];
const prices = [80000,160000,320000,400000,480000,560000,640000,720000,800000,880000];
const qty = ["1K","2K","3K","4K","5K","6K","7K","8K","9K","10K"];
qty.forEach((q,i)=>["instagram","tiktok"].forEach(platform=>fallbackPackages.push({
  id:`${platform}-${q}`, platform, qty:q, price:prices[i], guarantee:i===9?"30 hari":"7 hari"
})));

const fallbackSite = {
  brandName:"KENSEONN", heroTitle:"Security, Digital Growth & IT Service.",
  heroText:"Layanan digital profesional dengan proses berbasis izin, kesepakatan, dan ketentuan hukum yang berlaku.",
  aboutName:"Kenseonn Ethical Hacking",
  aboutBio:"Belajar 4+ tahun, menguasai berbagai tools keamanan dan development dengan fokus pada security testing yang legal, terukur, dan berizin.",
  email:"kendevelopersecurity@gmail.com", instagram:"kenseonn", whatsapp:"62895636069948",
  experience:"4+ years learning & building"
};

let services = fallbackServices, packages = fallbackPackages, site = fallbackSite;
const money = n => new Intl.NumberFormat("id-ID").format(n);

async function loadData(){
  try {
    const s = await getDocs(collection(db,"services"));
    const p = await getDocs(collection(db,"packages"));
    const cfg = await getDoc(doc(db,"siteConfig","main"));
    if(!s.empty) services=s.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.active!==false);
    if(!p.empty) packages=p.docs.map(d=>({id:d.id,...d.data()}));
    if(cfg.exists()) site={...site,...cfg.data()};
  } catch(e){ console.warn("Firebase belum siap, memakai data bawaan.", e); }
  render();
}
function render(){
  applyMaintenance();
  document.title=`${site.brandName||"Kenseonn"} — Digital IT Service`;
  byId("brandName").textContent=site.brandName||"KENSEONN";
  byId("heroTitle").textContent=site.heroTitle;
  byId("heroText").textContent=site.heroText;
  byId("aboutName").textContent=site.aboutName;
  byId("aboutBio").textContent=site.aboutBio;
  byId("terminalName").textContent=site.aboutName;
  byId("terminalExp").textContent=site.experience;
  byId("emailLink").textContent=site.email; byId("emailLink").href=`mailto:${site.email}`;
  byId("igLink").textContent=`@${site.instagram}`; byId("igLink").href=`https://instagram.com/${site.instagram}`;
  byId("waLink").href=`https://wa.me/${site.whatsapp}`;
  byId("serviceCount").textContent=services.length;
  byId("year").textContent=new Date().getFullYear();

  byId("servicesGrid").innerHTML=services.map(s=>`
    <article class="service-card"><div class="service-icon">${s.icon||"⚡"}</div><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p>
    <button class="btn small order-service" data-service="${escAttr(s.name)}">Order layanan <span>→</span></button></article>`).join("");
  byId("serviceSelect").innerHTML=services.map(s=>`<option>${esc(s.name)}</option>`).join("");
  renderPackages("instagram");
}
function renderPackages(platform){
  const list=packages.filter(p=>p.platform===platform).sort((a,b)=>parseInt(a.qty)-parseInt(b.qty));
  byId("packagesGrid").innerHTML=list.map(p=>`
    <article class="price-card ${p.qty==="10K"?"featured":""}">
      ${p.qty==="10K"?'<span class="popular">BEST VALUE</span>':""}
      <span class="price-platform">${platform.toUpperCase()}</span><h3>${esc(p.qty)} Followers</h3>
      <div class="price">Rp ${money(p.price)}</div><div class="guarantee">Garansi ${esc(p.guarantee)}</div>
      <button class="btn primary full order-package" data-service="${platform} ${p.qty} Followers — Rp ${p.price}">Order Paket</button>
    </article>`).join("");
}
function applyMaintenance(){
  const screen=byId("maintenanceScreen");
  if(!screen) return;
  const enabled=site.maintenanceEnabled===true;
  if(!enabled){screen.classList.add("hidden");document.body.classList.remove("maintenance-active");return;}
  screen.classList.remove("hidden");document.body.classList.add("maintenance-active");
  byId("maintenanceTitle").textContent=site.maintenanceTitle||"Website sedang maintenance";
  byId("maintenanceMessage").textContent=site.maintenanceMessage||"Kenseonn Digital IT Service sedang melakukan maintenance. Silakan kembali beberapa saat lagi.";
  byId("maintenanceStatus").textContent=site.maintenanceStatus||"MAINTENANCE";
  const wa=byId("maintenanceWa"),ig=byId("maintenanceIg");
  if(wa)wa.href=`https://wa.me/${site.whatsapp||"62895636069948"}`;
  if(ig)ig.href=`https://instagram.com/${site.instagram||"kenseonn"}`;
  startCountdown(site.maintenanceUntil);
}
let countdownTimer;
function startCountdown(until){
  clearInterval(countdownTimer);
  const el=byId("countdown"); if(!el)return;
  if(!until){el.textContent="MAINTENANCE";return;}
  const target=new Date(until).getTime();
  const tick=()=>{
    const diff=target-Date.now();
    if(diff<=0){el.textContent="MAINTENANCE";clearInterval(countdownTimer);return;}
    const h=Math.floor(diff/3600000),m=Math.floor(diff%3600000/60000),sec=Math.floor(diff%60000/1000);
    el.textContent=[h,m,sec].map((v,i)=>i===0?String(v).padStart(2,"0"):String(v).padStart(2,"0")).join(":");
  };
  tick(); countdownTimer=setInterval(tick,1000);
}

function byId(id){return document.getElementById(id)}
function esc(v=""){return String(v).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
function escAttr(v=""){return esc(v)}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>{document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");renderPackages(b.dataset.platform)}));
document.addEventListener("click",e=>{
  const b=e.target.closest(".order-service,.order-package");
  if(!b)return;
  const select=byId("serviceSelect");
  const requested=b.dataset.service;
  if(![...select.options].some(o=>o.value===requested)){
    const opt=document.createElement("option"); opt.value=requested; opt.textContent=requested; select.appendChild(opt);
  }
  select.value=requested;
  location.hash="order"; byId("orderForm").scrollIntoView({behavior:"smooth",block:"center"});
});
byId("orderForm").addEventListener("submit",async e=>{
  e.preventDefault(); const f=new FormData(e.currentTarget); const status=byId("orderStatus");
  const data={name:f.get("name").trim(),phone:f.get("phone").trim(),email:f.get("email").trim(),service:f.get("service"),details:f.get("details").trim(),status:"new",createdAt:serverTimestamp()};
  status.textContent="Mengirim order…";
  try{await addDoc(collection(db,"orders"),data);status.textContent="Order berhasil dikirim. Admin akan menghubungi Anda.";e.currentTarget.reset()}
  catch(err){console.error(err);status.textContent="Gagal mengirim. Pastikan Firebase sudah dikonfigurasi."}
});
loadData();
