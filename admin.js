import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc, serverTimestamp, orderBy, query } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const app=initializeApp(firebaseConfig), auth=getAuth(app), db=getFirestore(app);
const $=id=>document.getElementById(id), money=n=>new Intl.NumberFormat("id-ID").format(Number(n)||0);
let services=[],packages=[],orders=[];
const defaultServices = [
  ["security-assessment","🛡️","Cek Keamanan Website","Audit keamanan website secara authorized: konfigurasi, exposure, dan rekomendasi perbaikan."],
  ["wifi-audit","📡","Cek Keamanan WiFi","Assessment keamanan jaringan WiFi milik klien dengan scope dan izin yang jelas."],
  ["cctv-audit","📹","Cek Keamanan CCTV","Audit konfigurasi dan exposure CCTV/IP camera milik klien."],
  ["mobile-security","📱","Mobile Security Testing","Pengujian keamanan aplikasi/perangkat Android/iOS milik klien secara berizin."],
  ["wa-security","💬","WhatsApp Security & Troubleshooting","Bantuan keamanan akun, recovery guidance, konfigurasi privasi, dan troubleshooting legal."],
  ["link-security","🔗","Link Security Assessment","Pemeriksaan keamanan URL/domain dan simulasi awareness dengan izin."],
  ["social-boost","📈","Boosting All Medsos","Layanan digital marketing untuk Instagram, TikTok, YouTube, Facebook, X/Twitter dan traffic website."],
  ["private-training","🎓","Private Ethical Hacking","Belajar security testing, networking, web security, dan penggunaan tools secara legal."],
  ["osint-audit","🔎","OSINT & Exposure Check","Pemeriksaan jejak digital/exposure informasi pada target yang sah dan berizin."],
  ["custom-development","🧩","Custom Security Tool / Script","Development tool defensive, automation, monitoring, dan security testing legal."]
];
const defaultPackages = (()=>{const prices=[80000,160000,320000,400000,480000,560000,640000,720000,800000,880000], qty=["1K","2K","3K","4K","5K","6K","7K","8K","9K","10K"], out=[]; for(const platform of ["instagram","tiktok"]) qty.forEach((q,i)=>out.push({platform,qty:q,price:prices[i],guarantee:i===9?"30 hari":"7 hari"})); return out})();
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));

onAuthStateChanged(auth, async user=>{
  if(!user){$("loginView").classList.remove("hidden");$("dashboard").classList.add("hidden");return}
  try{
    const admin=await Promise.race([getDoc(doc(db,"admins",user.uid)),new Promise((_,reject)=>setTimeout(()=>reject(new Error("Pemeriksaan admin timeout. Cek koneksi, Firebase config, dan Firestore Rules.")),10000))]);
    if(!admin.exists()||admin.data().enabled!==true){
      $("loginStatus").textContent="Akun ini belum diberi akses admin.";
      await signOut(auth);
      return;
    }
    $("loginView").classList.add("hidden");$("dashboard").classList.remove("hidden");
    await refreshAll();
  }catch(err){
    console.error(err);
    $("loginStatus").textContent="Gagal memuat admin panel: "+(err?.code||err?.message||"periksa Firebase/Firestore Rules");
    $("dashboard").classList.add("hidden");$("loginView").classList.remove("hidden");
  }
});
$("loginForm").addEventListener("submit",async e=>{e.preventDefault();const status=$("loginStatus");status.textContent="Memproses…";try{await Promise.race([signInWithEmailAndPassword(auth,$("loginEmail").value.trim(),$("loginPassword").value),new Promise((_,reject)=>setTimeout(()=>reject(new Error("Login timeout. Periksa koneksi internet dan Firebase Authentication.")),15000))]);}catch(err){status.textContent="Login gagal: "+(err?.code||err?.message||"Unknown error");}});
$("logoutBtn").onclick=()=>signOut(auth);
document.querySelectorAll(".admin-tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".admin-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");document.querySelectorAll(".admin-pane").forEach(x=>x.classList.add("hidden"));$(b.dataset.pane).classList.remove("hidden")});

async function ensureDefaults(){
  const ss=await getDocs(collection(db,"services"));
  if(ss.empty){for(const [id,icon,name,description] of defaultServices) await setDoc(doc(db,"services",id),{icon,name,description,active:true});}
  const ps=await getDocs(collection(db,"packages"));
  if(ps.empty){for(const p of defaultPackages) await addDoc(collection(db,"packages"),p);}
  const site=await getDoc(doc(db,"siteConfig","main"));
  if(!site.exists()) await setDoc(doc(db,"siteConfig","main"),{brandName:"KENSEONN",heroTitle:"Security, Digital Growth & IT Service.",heroText:"Layanan digital profesional dengan proses berbasis izin, kesepakatan, dan ketentuan hukum yang berlaku.",aboutName:"Kenseonn Ethical Hacking",aboutBio:"Belajar 4+ tahun, menguasai berbagai tools keamanan dan development dengan fokus pada security testing yang legal, terukur, dan berizin.",email:"kendevelopersecurity@gmail.com",instagram:"kenseonn",whatsapp:"62895636069948",experience:"4+ years learning & building"});
}
async function refreshAll(){
  try{
    await ensureDefaults();
    await Promise.all([loadSite(),loadServices(),loadPackages(),loadOrders()]);
  }catch(err){
    console.error(err);
    $("siteStatus").textContent="Gagal memuat data Firebase. Cek Rules/konfigurasi.";
  }
}
async function loadSite(){
 const d=await getDoc(doc(db,"siteConfig","main")); if(!d.exists()) return;
 const data=d.data(), f=$("siteForm");
 Object.entries(data).forEach(([k,v])=>{
   if(f.elements[k] && f.elements[k].type !== "checkbox") f.elements[k].value=v ?? "";
 });
 if(f.elements.maintenanceEnabled) f.elements.maintenanceEnabled.checked=data.maintenanceEnabled===true;
}
async function loadServices(){const snap=await getDocs(collection(db,"services"));services=snap.docs.map(d=>({id:d.id,...d.data()}));$("statServices").textContent=services.length;renderServices()}
async function loadPackages(){const snap=await getDocs(collection(db,"packages"));packages=snap.docs.map(d=>({id:d.id,...d.data()}));$("statPackages").textContent=packages.length;renderPackages()}
async function loadOrders(){const snap=await getDocs(query(collection(db,"orders"),orderBy("createdAt","desc")));orders=snap.docs.map(d=>({id:d.id,...d.data()}));$("statOrders").textContent=orders.length;renderOrders()}
$("siteForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const f=new FormData(e.currentTarget), data=Object.fromEntries(f.entries());
  data.maintenanceEnabled=f.elements.maintenanceEnabled?.checked===true;
  data.maintenanceUntil=f.elements.maintenanceUntil?.value||"";
  try{
    await setDoc(doc(db,"siteConfig","main"),data,{merge:true});
    $("siteStatus").textContent="Tersimpan ✓";
    setTimeout(()=>$("siteStatus").textContent="",1800);
  }catch(err){
    console.error(err); $("siteStatus").textContent="Gagal menyimpan. Cek Firebase/Rules.";
  }
});
$("serviceForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const f=new FormData(e.currentTarget),id=f.get("id");
  const data={name:f.get("name"),icon:f.get("icon"),description:f.get("description"),active:f.get("active")==="true"};
  try{
    if(id) await updateDoc(doc(db,"services",id),data); else await addDoc(collection(db,"services"),data);
    e.currentTarget.reset();e.currentTarget.elements.id.value="";await loadServices();
  }catch(err){console.error(err);alert("Gagal menyimpan layanan. Periksa Firebase/Rules.");}
});
$("serviceCancel").onclick=()=>{const f=$("serviceForm");f.reset();f.elements.id.value=""};
$("packageForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const f=new FormData(e.currentTarget),id=f.get("id");
  const data={platform:f.get("platform"),qty:f.get("qty").toUpperCase(),price:Number(f.get("price")),guarantee:f.get("guarantee")};
  try{
    if(id) await updateDoc(doc(db,"packages",id),data); else await addDoc(collection(db,"packages"),data);
    e.currentTarget.reset();e.currentTarget.elements.id.value="";await loadPackages();
  }catch(err){console.error(err);alert("Gagal menyimpan paket. Periksa Firebase/Rules.");}
});
$("packageCancel").onclick=()=>{const f=$("packageForm");f.reset();f.elements.id.value=""};
$("refreshOrders").onclick=loadOrders;

function renderServices(){$("servicesAdminList").innerHTML=services.map(s=>`<div class="admin-row"><div><b>${esc(s.icon)} ${esc(s.name)}</b><small>${esc(s.description)}</small></div><span>${s.active===false?"OFF":"ON"}</span><button class="btn small edit-service" data-id="${s.id}">Edit</button><button class="btn small danger del-service" data-id="${s.id}">Hapus</button></div>`).join("")}
function renderPackages(){$("packagesAdminList").innerHTML=packages.sort((a,b)=>a.platform.localeCompare(b.platform)||parseInt(a.qty)-parseInt(b.qty)).map(p=>`<div class="admin-row"><div><b>${esc(p.platform)} ${esc(p.qty)}</b><small>Rp ${money(p.price)} • Garansi ${esc(p.guarantee)}</small></div><button class="btn small edit-package" data-id="${p.id}">Edit</button><button class="btn small danger del-package" data-id="${p.id}">Hapus</button></div>`).join("")}
function renderOrders(){$("ordersAdminList").innerHTML=orders.map(o=>`<div class="order-row"><div><b>${esc(o.name)} • ${esc(o.service)}</b><small>${esc(o.phone)} ${o.email?"• "+esc(o.email):""}</small><p>${esc(o.details)}</p></div><select class="status-select" data-id="${o.id}">${["new","contacted","paid","processing","done","cancelled"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select></div>`).join("")}

document.addEventListener("click",async e=>{
 const b=e.target.closest("button"); if(!b)return;
 if(b.classList.contains("edit-service")){const s=services.find(x=>x.id===b.dataset.id),f=$("serviceForm");Object.entries(s).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v});return}
 if(b.classList.contains("del-service")){if(confirm("Hapus layanan ini?")){try{await deleteDoc(doc(db,"services",b.dataset.id));await loadServices()}catch(err){console.error(err);alert("Gagal menghapus layanan.")}}return}
 if(b.classList.contains("edit-package")){const p=packages.find(x=>x.id===b.dataset.id),f=$("packageForm");Object.entries(p).forEach(([k,v])=>{if(f.elements[k])f.elements[k].value=v});return}
 if(b.classList.contains("del-package")){if(confirm("Hapus paket ini?")){try{await deleteDoc(doc(db,"packages",b.dataset.id));await loadPackages()}catch(err){console.error(err);alert("Gagal menghapus paket.")}}return}
});
document.addEventListener("change",async e=>{
  if(e.target.classList.contains("status-select")){
    try{await updateDoc(doc(db,"orders",e.target.dataset.id),{status:e.target.value,updatedAt:serverTimestamp()})}
    catch(err){console.error(err);alert("Gagal memperbarui status order.");}
  }
});
