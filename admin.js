// Tampilkan kegagalan JavaScript yang sebelumnya membuat tombol tampak tidak merespons.
window.addEventListener("error", event => {
  const status = document.getElementById("loginStatus");
  if (status && !document.getElementById("dashboard")?.classList.contains("hidden")) return;
  if (status) status.textContent = `Kesalahan JavaScript: ${event.message || "modul gagal dimuat"}. Periksa koneksi dan konfigurasi Firebase.`;
});
window.addEventListener("unhandledrejection", event => {
  const status = document.getElementById("loginStatus");
  if (status) status.textContent = `Proses gagal: ${event.reason?.code || event.reason?.message || "kesalahan tidak diketahui"}`;
});


import {
  initializeApp,
  getApp,
  getApps
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  orderBy,
  query,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("id-ID").format(Number(n) || 0);

let services = [];
let packages = [];
let orders = [];
let busy = false;
let customers = [];
let supportTickets = [];
let reviews = [];
let reviewLikeCounts = {};
let reviewLikeAdjustments = {};
let adminLogs = [];
let liveUnsubscribers = [];
const adminLoginCooldownKey = "kenseonn_admin_login_until";

const defaultServices = [
  ['security-assessment', '🛡️', 'Audit Keamanan Website', 'Pemeriksaan konfigurasi dan risiko keamanan website milik klien.'],
  ['wifi-audit', '📡', 'Audit Keamanan WiFi', 'Pemeriksaan keamanan jaringan WiFi dengan izin pemilik.'],
  ['cctv-audit', '📹', 'Audit CCTV & NVR', 'Review konfigurasi, akses, firmware, dan keamanan perangkat CCTV.'],
  ['mobile-security', '📱', 'Mobile App Security Review', 'Review keamanan aplikasi Android/iOS dengan izin.'],
  ['wa-security', '💬', 'Konsultasi Keamanan WhatsApp', 'Panduan privasi, keamanan akun, dan pemulihan akses resmi.'],
  ['domain-check', '🌐', 'Pemeriksaan Domain & DNS', 'Pemeriksaan DNS, konfigurasi domain, dan keamanan dasar.'],
  ['ssl-setup', '🔒', 'Instalasi SSL/TLS', 'Konfigurasi sertifikat HTTPS untuk domain yang dikelola klien.'],
  ['website-maintenance', '🧰', 'Maintenance Website', 'Pembaruan, perbaikan bug, dan pengecekan rutin website.'],
  ['wordpress-care', '📰', 'WordPress Care', 'Update plugin/tema, hardening dasar, backup, dan troubleshooting.'],
  ['malware-cleanup', '🧹', 'Pembersihan Malware Website', 'Pemeriksaan dan pembersihan malware pada website milik klien.'],
  ['backup-restore', '💾', 'Backup & Restore Website', 'Pembuatan backup dan pemulihan file/database.'],
  ['web-development', '💻', 'Pembuatan Website', 'Landing page, company profile, katalog, atau website custom.'],
  ['web-redesign', '🎨', 'Redesign UI Website', 'Penyegaran antarmuka, responsif, dan pengalaman pengguna.'],
  ['hosting-setup', '☁️', 'Setup Hosting & Deployment', 'Konfigurasi hosting, domain, SSL, dan deployment.'],
  ['email-business', '✉️', 'Setup Email Bisnis', 'Konfigurasi email domain dan DNS email.'],
  ['database-setup', '🗄️', 'Setup Database', 'Perancangan database dan konfigurasi akses sesuai kebutuhan.'],
  ['firebase-setup', '🔥', 'Firebase Setup', 'Setup Firebase Auth, Firestore, Hosting, dan security rules.'],
  ['automation-script', '⚙️', 'Automation Script', 'Script otomasi untuk workflow yang sah dan disetujui.'],
  ['bot-development', '🤖', 'Bot & Integration Development', 'Bot layanan/integrasi API untuk penggunaan yang sah.'],
  ['api-integration', '🔌', 'API Integration', 'Integrasi API resmi antar aplikasi dan layanan.'],
  ['pc-troubleshoot', '🖥️', 'Troubleshooting PC/Laptop', 'Diagnosa software, sistem operasi, dan performa perangkat.'],
  ['android-support', '📲', 'Android Troubleshooting', 'Bantuan konfigurasi, backup, dan pemecahan masalah Android.'],
  ['network-setup', '🕸️', 'Setup Jaringan LAN', 'Perencanaan dan konfigurasi jaringan lokal.'],
  ['osint-audit', '🔎', 'OSINT Exposure Review', 'Pemeriksaan paparan informasi publik secara etis dan sah.'],
  ['security-training', '🎓', 'Private Cybersecurity Training', 'Pelatihan dasar keamanan siber dan praktik defensif.'],
  ['custom-development', '🧩', 'Custom Software Development', 'Pembuatan aplikasi atau tools sesuai ruang lingkup proyek.'],
  ['social-marketing', '📈', 'Social Media Marketing', 'Konsultasi kampanye dan pemasaran media sosial.'],
  ['content-design', '🖼️', 'Desain Konten Digital', 'Desain aset visual untuk kebutuhan digital.'],
  ['seo-audit', '📊', 'SEO Basic Audit', 'Audit dasar struktur SEO teknis dan konten website.'],
  ['consultation', '🧑\u200d💼', 'Konsultasi IT', 'Konsultasi kebutuhan IT, estimasi pekerjaan, dan rekomendasi solusi.']
];

// Tidak membuat paket/harga contoh otomatis agar pelanggan tidak melihat harga fiktif.
const defaultPackages = [];

function esc(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function showStatus(id, message) {
  const element = $(id);
  if (element) element.textContent = message;
}

function showError(action, error) {
  console.error(action, error);
  return `${action}: ${error?.code || error?.message || "Terjadi kesalahan"}`;
}

function setBusy(button, value) {
  if (!button) return;
  if (value) {
    if (!button.dataset.idleHtml) button.dataset.idleHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="button-spinner" aria-hidden="true"></span> Memproses...';
  } else {
    button.disabled = false;
    if (button.dataset.idleHtml) { button.innerHTML = button.dataset.idleHtml; delete button.dataset.idleHtml; }
  }
}

function getFormValue(form, name) {
  return form.elements.namedItem(name);
}


// LOGIN DAN PEMERIKSAAN ADMIN

onAuthStateChanged(auth, async user => {
  if (!user) {
    liveUnsubscribers.forEach(fn=>{try{fn();}catch{}}); liveUnsubscribers=[];
    $("loginView")?.classList.remove("hidden");
    $("dashboard")?.classList.add("hidden");
    return;
  }

  showStatus("loginStatus", "Memeriksa akses admin...");

  try {
    const adminRef = doc(db, "admins", user.uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists() || adminSnap.data().enabled !== true) {
      showStatus("loginStatus", `Login Firebase berhasil, tetapi UID ini belum diaktifkan sebagai admin. UID: ${user.uid}. Buat dokumen admins/${user.uid} dengan enabled: true di Firestore.`);
      await signOut(auth);
      return;
    }

    $("loginView")?.classList.add("hidden");
    $("dashboard")?.classList.remove("hidden");

    await refreshAll();
  } catch (error) {
    showStatus("loginStatus", showError("Gagal memuat admin panel", error));
    $("dashboard")?.classList.add("hidden");
    $("loginView")?.classList.remove("hidden");
  }
});

$("loginForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');

  const until = Number(sessionStorage.getItem(adminLoginCooldownKey) || 0);
  if (until > Date.now()) { showStatus("loginStatus", `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((until-Date.now())/60000)} menit.`); return; }
  if (button.disabled) return;
  showStatus("loginStatus", "Memproses login...");
  setBusy(button, true);

  try {
    await signInWithEmailAndPassword(
      auth,
      $("loginEmail").value.trim(),
      $("loginPassword").value
    );
  } catch (error) {
    if (error.code === "auth/too-many-requests") sessionStorage.setItem(adminLoginCooldownKey, String(Date.now()+15*60*1000));
    const messages = {
      "auth/too-many-requests": "Firebase membatasi login sementara. Tunggu 15 menit.",
      "auth/invalid-credential": "Email atau password admin tidak sesuai.",
      "auth/user-disabled": "Akun admin dinonaktifkan di Firebase Authentication.",
      "auth/network-request-failed": "Koneksi internet gagal menghubungi Firebase.",
      "auth/operation-not-allowed": "Login Email/Password belum diaktifkan di Firebase Authentication."
    };
    const message = messages[error.code] || `${error.code || error.message}`;
    showStatus("loginStatus", `Login gagal: ${message}`);
  } finally {
    setBusy(button, false);
  }
});

$("logoutBtn")?.addEventListener("click", async () => {
  try {
    await signOut(auth);
  } catch (error) {
    alert(showError("Logout gagal", error));
  }
});

// NAVIGASI TAB ADMIN

document.querySelectorAll(".admin-tab").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".admin-tab").forEach(tab => {
      tab.classList.toggle("active", tab === button);
    });

    document.querySelectorAll(".admin-pane").forEach(pane => {
      pane.classList.add("hidden");
    });

    const target = $(button.dataset.pane);
    target?.classList.remove("hidden");
  });
});

// DATA AWAL DAN PEMUATAN DATA

async function ensureDefaults() {
  // Do not repopulate an intentionally emptied services collection.
  // Catalog entries are created only by an explicit admin action.
  const siteRef = doc(db, "siteConfig", "main");
  const siteSnap = await getDoc(siteRef);

  if (!siteSnap.exists()) {
    await setDoc(siteRef, {
      brandName: "KENSEONN",
      heroTitle: "Security, Digital Growth & IT Service.",
      heroText: "Layanan digital profesional berbasis izin.",
      aboutName: "Kenseonn Ethical Hacking",
      aboutBio: "Fokus pada pengujian keamanan yang legal dan berizin.",
      email: "kendevelopersecurity@gmail.com",
      instagram: "kenseonn",
      whatsapp: "62895636069948",
      experience: "4+ years learning & building",
      registrationEnabled: true,
      maintenanceEnabled: false,
      maintenanceTitle: "Website sedang maintenance",
      maintenanceMessage: "Silakan kembali beberapa saat lagi.",
      maintenanceUntil: "",
      maintenanceStatus: "MAINTENANCE"
    });
  }
}

async function refreshAll() {
  showStatus("siteStatus", "Memuat data...");

  try {
    await ensureDefaults();

    await Promise.all([
      loadSite(),
      loadServices(),
      loadPackages(),
      loadOrders(),
      loadTickets(),
      loadReviews()
    ]);

    showStatus("siteStatus", "Data berhasil dimuat ✓");
  } catch (error) {
    showStatus("siteStatus", showError("Gagal memuat data", error));
  }
}


async function loadSite() {
  const snapshot = await getDoc(doc(db, "siteConfig", "main"));
  if (!snapshot.exists()) return;

  const data = snapshot.data();
  const form = $("siteForm");
  if (!form) return;

  for (const [key, value] of Object.entries(data)) {
    const field = getFormValue(form, key);
    if (!field) continue;

    if (field.type === "checkbox") {
      field.checked = value === true;
    } else {
      field.value = value ?? "";
    }
  }

  const maintenance = getFormValue(form, "maintenanceEnabled");
  if (maintenance) {
    maintenance.checked = data.maintenanceEnabled === true;
  }
}

async function loadServices() {
  const snapshot = await getDocs(collection(db, "services"));

  services = snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));

  showStatus("statServices", services.length);
  renderServices();
}

async function loadPackages() {
  const snapshot = await getDocs(collection(db, "packages"));

  packages = snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));

  showStatus("statPackages", packages.length);
  renderPackages();
}

async function loadOrders() {
  const snapshot = await getDocs(
    query(collection(db, "orders"), orderBy("createdAt", "desc"))
  );

  orders = snapshot.docs.map(item => ({
    id: item.id,
    ...item.data()
  }));

  showStatus("statOrders", orders.length);
  renderOrders();
  if (typeof renderOrderTools === "function") renderOrderTools();
}

async function loadTickets() {
  const snapshot = await getDocs(query(collection(db, "supportTickets"), orderBy("createdAt", "desc")));
  supportTickets = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  renderTickets();
}

function renderTickets() {
  const target = $("ticketsAdminList");
  if (!target) return;
  if (!supportTickets.length) {
    target.innerHTML = '<p class="muted-note">Belum ada tiket. Tiket baru akan tampil setelah pengunjung mengirim formulir bantuan dan data berhasil tersimpan di Firestore.</p>';
    return;
  }
  target.innerHTML = supportTickets.map(ticket => `
    <article class="admin-row ticket-row">
      <div class="ticket-main">
        <div class="ticket-heading"><b>${esc(ticket.ticketCode || ticket.id)}</b><span class="status-chip">${esc(ticket.status || "open")}</span></div>
        <small>${esc(ticket.name || "Tanpa nama")} · ${esc(ticket.email || "")} · ${esc(ticket.phone || "")}<br>${esc(ticket.category || "Bantuan")} · ${esc(dateValue(ticket.createdAt))}</small>
        <p class="ticket-message">${esc(ticket.message || "")}</p>
        ${ticket.adminReply ? `<div class="ticket-reply"><b>Balasan admin</b><p>${esc(ticket.adminReply)}</p></div>` : ""}
        <label class="ticket-reply-label">Balasan admin<textarea rows="3" data-ticket-reply="${esc(ticket.id)}" placeholder="Tulis balasan untuk pelanggan...">${esc(ticket.adminReply || "")}</textarea></label>
        <div class="ticket-actions"><select data-ticket-status="${esc(ticket.id)}"><option value="open" ${ticket.status === "open" ? "selected" : ""}>Open</option><option value="in_progress" ${ticket.status === "in_progress" ? "selected" : ""}>Diproses</option><option value="resolved" ${ticket.status === "resolved" ? "selected" : ""}>Selesai</option><option value="closed" ${ticket.status === "closed" ? "selected" : ""}>Ditutup</option></select><button class="btn primary small save-ticket" data-id="${esc(ticket.id)}" type="button">Simpan Balasan & Status</button></div>
      </div>
    </article>`).join("");
}

$("refreshTickets")?.addEventListener("click", async () => {
  const button = $("refreshTickets"); button.disabled = true;
  try { await loadTickets(); }
  catch (error) { alert(showError("Gagal memuat tiket bantuan", error)); }
  finally { button.disabled = false; }
});

$("ticketsAdminList")?.addEventListener("click", async event => {
  const button = event.target.closest(".save-ticket");
  if (!button) return;
  const id = button.dataset.id;
  const reply = document.querySelector(`[data-ticket-reply="${id}"]`)?.value.trim() || "";
  const status = document.querySelector(`[data-ticket-status="${id}"]`)?.value || "open";
  button.disabled = true;
  try {
    await updateDoc(doc(db, "supportTickets", id), { adminReply: reply, status, updatedAt: serverTimestamp() });
    await loadTickets();
    logActivity(`Membalas/memperbarui tiket ${id}`);
  } catch (error) { alert(showError("Gagal menyimpan balasan tiket", error)); }
  finally { button.disabled = false; }
});

async function loadReviews() {
  const [snap, likesSnap] = await Promise.all([
    getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc"))),
    getDocs(collection(db, "reviewLikes"))
  ]);
  reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  reviewLikeCounts = {};
  likesSnap.docs.forEach(like => { const rid = like.data().reviewId; if (rid) reviewLikeCounts[rid] = (reviewLikeCounts[rid] || 0) + 1; });
  const adjSnap=await getDocs(collection(db,"reviewLikeAdjustments")); reviewLikeAdjustments={}; adjSnap.docs.forEach(d=>reviewLikeAdjustments[d.id]=Number(d.data().count)||0);
  renderReviewsAdmin();
}

function renderReviewsAdmin() {
  const host = $("reviewsAdminList");
  if (!host) return;
  host.innerHTML = reviews.map(item => `<div class="admin-row"><div><b>${esc(item.customerName || "Pelanggan")} · ${"★".repeat(Math.max(1,Math.min(5,Number(item.rating)||5)))}</b><small>${esc(item.platform || "")} · ${esc(item.message || "")}</small><small>Status: ${item.active === false ? "Disembunyikan" : "Tampil"} · ♥ ${(reviewLikeCounts[item.id] || 0)+(reviewLikeAdjustments[item.id]||0)} Like tersimpan</small><label class="like-admin-control">Penyesuaian Like admin<input class="admin-like-count" type="number" min="0" max="100000000" value="${reviewLikeAdjustments[item.id]||0}" data-id="${esc(item.id)}"></label><button class="btn small save-admin-likes" type="button" data-id="${esc(item.id)}">Simpan angka</button></div><button class="btn small edit-review" type="button" data-id="${esc(item.id)}">Edit</button><button class="btn small danger delete-review" type="button" data-id="${esc(item.id)}">Hapus</button></div>`).join("") || '<p class="muted-note">Belum ada ulasan. Tambahkan feedback pelanggan asli di atas.</p>';
}

async function loadCustomers() {
  const snapshot = await getDocs(collection(db, "customers"));
  customers = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
  const count = $("statCustomers"); if (count) count.textContent = customers.length;
  renderCustomers();
}

function renderCustomers() {
  const target = $("customersAdminList"); if (!target) return;
  const q = String($("customerSearch")?.value || "").toLowerCase();
  const list = customers.filter(c => [c.name,c.email,c.phone,c.id].some(v => String(v||"").toLowerCase().includes(q)));
  target.innerHTML = list.map(c => `<article class="admin-row"><div><b>${esc(c.name || "Pelanggan")}</b><small>${esc(c.email || "")} · UID ${esc(c.id)}<br>WhatsApp: ${esc(c.phone || "Belum diisi")} · Daftar: ${esc(dateValue(c.createdAt) || "Tidak tersedia")}</small></div><div><span class="status-chip">${c.archived ? "Diarsipkan" : (c.emailVerified === true ? "Email terverifikasi" : "Menunggu verifikasi")}</span><button type="button" class="btn small customer-archive" data-id="${esc(c.id)}" data-archived="${c.archived===true}">${c.archived ? "Pulihkan" : "Arsipkan"}</button></div></article>`).join("") || '<p class="muted-note">Belum ada pelanggan yang cocok.</p>';
}
$("customerSearch")?.addEventListener("input", renderCustomers);
$("customersAdminList")?.addEventListener("click", async e=>{
  const btn=e.target.closest(".customer-archive"); if(!btn) return;
  const id=btn.dataset.id, archived=btn.dataset.archived!=="true";
  if(!confirm(archived ? "Arsipkan pelanggan ini? Akun Firebase Auth tidak dihapus." : "Pulihkan profil pelanggan ini?")) return;
  btn.disabled=true;
  try {
    await updateDoc(doc(db,"customers",id),{archived,archivedAt:serverTimestamp()});
    logActivity(`${archived?"Mengarsipkan":"Memulihkan"} profil pelanggan ${id}`);
    await loadCustomers();
  } catch(err) { alert(showError("Gagal mengubah arsip pelanggan",err)); }
  finally { btn.disabled=false; }
});
$("showArchivedOrders")?.addEventListener("change", renderOrders);

// SIMPAN WEBSITE DAN MAINTENANCE MODE

$("siteForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const fields = new FormData(form);
  const data = Object.fromEntries(fields.entries());

  // Checkbox yang tidak dicentang tidak masuk FormData.
  // Karena itu, baca langsung dari elemen form.
  const maintenanceField = getFormValue(form, "maintenanceEnabled");
  data.maintenanceEnabled = maintenanceField?.checked === true;
  data.registrationEnabled = getFormValue(form, "registrationEnabled")?.checked !== false;

  const untilField = getFormValue(form, "maintenanceUntil");
  data.maintenanceUntil = untilField?.value || "";

  showStatus("siteStatus", "Menyimpan pengaturan...");
  setBusy(button, true);

  try {
    await setDoc(doc(db, "siteConfig", "main"), data, { merge: true });

    showStatus("siteStatus", "Pengaturan berhasil disimpan ✓");
    logActivity(`Ubah pengaturan website · Pendaftaran ${data.registrationEnabled ? "ON" : "OFF"} · Maintenance ${data.maintenanceEnabled ? "ON" : "OFF"}`);
  } catch (error) {
    showStatus("siteStatus", showError("Gagal menyimpan website", error));
  } finally {
    setBusy(button, false);
  }
});

// TAMBAH DAN EDIT LAYANAN

$("serviceForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const fields = new FormData(form);
  const id = String(fields.get("id") || "").trim();

  const data = {
    name: String(fields.get("name") || "").trim(),
    icon: String(fields.get("icon") || "").trim(),
    description: String(fields.get("description") || "").trim(),
    active: fields.get("active") === "true"
  };

  if (!data.name || !data.description) {
    alert("Nama layanan dan deskripsi wajib diisi.");
    return;
  }

  setBusy(button, true);

  try {
    if (id) {
      await updateDoc(doc(db, "services", id), data);
    } else {
      await addDoc(collection(db, "services"), data);
    }

    form.reset();
    getFormValue(form, "id").value = "";
    await loadServices();
    alert("Layanan berhasil disimpan ✓");
  } catch (error) {
    alert(showError("Gagal menyimpan layanan", error));
  } finally {
    setBusy(button, false);
  }
});

$("serviceCancel")?.addEventListener("click", () => {
  const form = $("serviceForm");
  form?.reset();
  if (form) getFormValue(form, "id").value = "";
});

// TAMBAH DAN EDIT PAKET

$("packageForm")?.addEventListener("submit", async event => {
  event.preventDefault();

  const form = event.currentTarget;
  const button = form.querySelector('[type="submit"]');
  const fields = new FormData(form);
  const id = String(fields.get("id") || "").trim();

  const data = {
    platform: String(fields.get("platform") || "").trim(),
    type: String(fields.get("type") || "Followers").trim(),
    qty: String(fields.get("qty") || "").trim().toUpperCase(),
    price: Number(fields.get("price")),
    guarantee: String(fields.get("guarantee") || "").trim(),
    description: String(fields.get("description") || "").trim()
  };

  if (
    !data.platform ||
    !data.qty ||
    !Number.isFinite(data.price) ||
    data.price < 0 ||
    !data.guarantee
  ) {
    alert("Periksa kembali platform, jumlah, harga, dan garansi.");
    return;
  }

  setBusy(button, true);

  try {
    if (id) {
      await updateDoc(doc(db, "packages", id), data);
    } else {
      await addDoc(collection(db, "packages"), data);
    }

    form.reset();
    getFormValue(form, "id").value = "";
    await loadPackages();
    alert("Paket berhasil disimpan ✓");
  } catch (error) {
    alert(showError("Gagal menyimpan paket", error));
  } finally {
    setBusy(button, false);
  }
});

$("packageCancel")?.addEventListener("click", () => {
  const form = $("packageForm");
  form?.reset();
  if (form) getFormValue(form, "id").value = "";
});

// TAMPILKAN DAFTAR LAYANAN

function renderServices() {
  const container = $("servicesAdminList");
  if (!container) return;

  container.innerHTML = services.map(service => `
    <div class="admin-row">
      <div>
        <b>${esc(service.icon)} ${esc(service.name)}</b>
        <small>${esc(service.description)}</small>
      </div>
      <span>${service.active === false ? "OFF" : "ON"}</span>
      <button type="button" class="btn small edit-service"
        data-id="${esc(service.id)}">Edit</button>
      <button type="button" class="btn small danger del-service"
        data-id="${esc(service.id)}">Hapus</button>
    </div>
  `).join("");
}

// TAMPILKAN DAFTAR PAKET

function renderPackages() {
  const container = $("packagesAdminList");
  if (!container) return;

  const sorted = [...packages].sort((a, b) =>
    String(a.platform || "").localeCompare(String(b.platform || "")) ||
    (parseInt(a.qty, 10) || 0) - (parseInt(b.qty, 10) || 0)
  );

  container.innerHTML = sorted.map(item => `
    <div class="admin-row">
      <div>
        <b>${esc(item.platform)} ${esc(item.qty)} ${esc(item.type || "Followers")}</b>
        <small>Rp ${money(item.price)} • Garansi ${esc(item.guarantee)}</small>
      </div>
      <button type="button" class="btn small edit-package"
        data-id="${esc(item.id)}">Edit</button>
      <button type="button" class="btn small danger del-package"
        data-id="${esc(item.id)}">Hapus</button>
    </div>
  `).join("");
}

// TAMPILKAN ORDER

function renderOrders() {
  const container = $("ordersAdminList");
  if (!container) return;

  const showArchived = $("showArchivedOrders")?.checked === true;
  const visibleOrders = orders.filter(item => showArchived ? item.archived === true : item.archived !== true);
  container.innerHTML = visibleOrders.map(item => `
    <div class="order-row order-row-expanded">
      <div>
        <b>${esc(item.orderCode || item.id)} · ${esc(item.name || "Tanpa nama")} • ${esc(item.service || "")}</b>
        <small>${esc(item.phone || "")} ${item.email ? "• " + esc(item.email) : ""} · ${esc(dateValue(item.createdAt))}</small>
        <p>${esc(item.details || "")}</p>
        <div class="order-admin-controls">
          <label>Status order<select class="status-select" data-id="${esc(item.id)}">${["new", "contacted", "paid", "processing", "done", "cancelled"].map(status => `<option value="${status}" ${item.status === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
          <label>Status pembayaran<select class="payment-status-select" data-id="${esc(item.id)}">${["awaiting_quote","awaiting_payment","paid","rejected","refunded"].map(status => `<option value="${status}" ${(item.paymentStatus || "awaiting_quote") === status ? "selected" : ""}>${status}</option>`).join("")}</select></label>
          <label>Total tagihan (Rp)<input class="order-price-input" data-id="${esc(item.id)}" type="number" min="0" step="1000" value="${Number(item.price)||0}"></label>
          <label class="payment-note-field">Instruksi / catatan pembayaran<input class="payment-note-input" data-id="${esc(item.id)}" maxlength="500" value="${esc(item.paymentNote || "")}" placeholder="Transfer ke ..."></label>
          <button type="button" class="btn small save-order-payment" data-id="${esc(item.id)}">Simpan pembayaran</button>
          ${["done","cancelled"].includes(item.status) && !item.archived ? `<button type="button" class="btn small archive-order" data-id="${esc(item.id)}">Arsipkan</button>` : ""}${item.archived ? `<button type="button" class="btn small restore-order" data-id="${esc(item.id)}">Pulihkan</button>` : ""}
        </div>
      </div>
    </div>
  `).join("");
}

// EDIT DAN HAPUS LAYANAN / PAKET

document.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.classList.contains("archive-order") || button.classList.contains("restore-order")) {
    const item = orders.find(order => order.id === button.dataset.id);
    if (!item || !["done", "cancelled"].includes(item.status)) { alert("Hanya pesanan selesai atau dibatalkan yang dapat diarsipkan."); return; }
    const archived = button.classList.contains("archive-order");
    if (!confirm(archived ? "Arsipkan pesanan ini? Data tetap tersimpan." : "Pulihkan pesanan dari arsip?")) return;
    try { button.disabled = true; await updateDoc(doc(db, "orders", item.id), { archived, updatedAt: serverTimestamp() }); await loadOrders(); }
    catch (error) { alert(showError("Gagal mengubah arsip pesanan", error)); button.disabled = false; }
    return;
  }

  if (button.classList.contains("delete-order")) {
    const item = orders.find(order => order.id === button.dataset.id);
    if (!item || !["done", "cancelled"].includes(item.status)) { alert("Hanya pesanan selesai atau dibatalkan yang dapat dihapus."); return; }
    if (!confirm(`Hapus pesanan ${item.orderCode || item.id} secara permanen? Tindakan ini tidak dapat dibatalkan.`)) return;
    try { button.disabled = true; await deleteDoc(doc(db, "orders", item.id)); await loadOrders(); alert("Pesanan berhasil dihapus."); }
    catch (error) { alert(showError("Gagal menghapus pesanan", error)); button.disabled = false; }
    return;
  }

  if (button.classList.contains("edit-service")) {
    const item = services.find(service => service.id === button.dataset.id);
    const form = $("serviceForm");
    if (!item || !form) return;

    for (const key of ["id", "name", "icon", "description", "active"]) {
      const field = getFormValue(form, key);
      if (field) field.value = item[key] ?? "";
    }

    $("servicesPane")?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  if (button.classList.contains("del-service")) {
    if (!confirm("Hapus layanan ini?")) return;

    try {
      await deleteDoc(doc(db, "services", button.dataset.id));
      await loadServices();
      alert("Layanan berhasil dihapus.");
    } catch (error) {
      alert(showError("Gagal menghapus layanan", error));
    }
    return;
  }

  if (button.classList.contains("edit-package")) {
    const item = packages.find(pkg => pkg.id === button.dataset.id);
    const form = $("packageForm");
    if (!item || !form) return;

    for (const key of ["id", "platform", "type", "qty", "price", "guarantee"]) {
      const field = getFormValue(form, key);
      if (field) field.value = item[key] ?? "";
    }

    $("packagesPane")?.scrollIntoView({ behavior: "smooth" });
    return;
  }

  if (button.classList.contains("del-package")) {
    if (!confirm("Hapus paket ini?")) return;

    try {
      await deleteDoc(doc(db, "packages", button.dataset.id));
      await loadPackages();
      alert("Paket berhasil dihapus.");
    } catch (error) {
      alert(showError("Gagal menghapus paket", error));
    }
  }
});

// SIMPAN NOMINAL DAN INSTRUKSI PEMBAYARAN DIRECT
 document.addEventListener("click", async event => {
   const button = event.target.closest(".save-order-payment");
   if (!button) return;
   const id = button.dataset.id;
   const price = Number(document.querySelector(`.order-price-input[data-id="${id}"]`)?.value || 0);
   const paymentNote = document.querySelector(`.payment-note-input[data-id="${id}"]`)?.value.trim() || "";
   const paymentStatus = document.querySelector(`.payment-status-select[data-id="${id}"]`)?.value || "awaiting_quote";
   if (!Number.isFinite(price) || price < 0) { alert("Nominal pembayaran tidak valid."); return; }
   try { button.disabled = true; await updateDoc(doc(db, "orders", id), { price, paymentNote, paymentStatus, updatedAt: serverTimestamp() }); await loadOrders(); alert("Nominal dan instruksi pembayaran diperbarui."); }
   catch (error) { alert(showError("Gagal menyimpan pembayaran", error)); }
   finally { button.disabled = false; }
 });

// UBAH STATUS ORDER

document.addEventListener("change", async event => {
  const field = event.target;

  if (!field.classList.contains("status-select")) return;

  try {
    await updateDoc(doc(db, "orders", field.dataset.id), {
      status: field.value,
      updatedAt: serverTimestamp()
    });

    showStatus("siteStatus", "Status order berhasil diperbarui ✓");
    await loadOrders();
  } catch (error) {
    alert(showError("Gagal memperbarui status order", error));
    await loadOrders().catch(loadError => {
      console.error("Gagal memuat ulang order:", loadError);
    });
  }
});

// MUAT ULANG ORDER

$("refreshOrders")?.addEventListener("click", async () => {
  const button = $("refreshOrders");
  setBusy(button, true);

  try {
    await loadOrders();
  } catch (error) {
    alert(showError("Gagal memuat order", error));
  } finally {
    setBusy(button, false);
  }
});


// REVIEW MANAGEMENT — actual Firestore documents, no demo records.
$("reviewForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget, button = form.querySelector('[type="submit"]'), f = new FormData(form), id = String(f.get("id") || "").trim();
  const data = { customerName: String(f.get("customerName") || "").trim(), platform: String(f.get("platform") || "").trim(), rating: Number(f.get("rating") || 5), message: String(f.get("message") || "").trim(), active: f.get("active") === "on", updatedAt: serverTimestamp() };
  if (data.customerName.length < 2 || data.message.length < 5 || data.rating < 1 || data.rating > 5) { showStatus("reviewStatus", "Periksa nama, isi ulasan, dan rating."); return; }
  setBusy(button, true);
  try {
    if (id) await updateDoc(doc(db, "reviews", id), data);
    else await addDoc(collection(db, "reviews"), { ...data, createdAt: serverTimestamp() });
    form.reset(); getFormValue(form, "id").value = ""; getFormValue(form, "active").checked = true;
    await loadReviews(); showStatus("reviewStatus", "Ulasan tersimpan di Firestore."); logActivity("Mengelola ulasan pelanggan");
  } catch (error) { showStatus("reviewStatus", showError("Gagal menyimpan ulasan", error)); }
  finally { setBusy(button, false); }
});
$("reviewCancel")?.addEventListener("click", () => { const f = $("reviewForm"); f?.reset(); if (f) { getFormValue(f,"id").value=""; getFormValue(f,"active").checked=true; } });
$("refreshReviews")?.addEventListener("click", async () => { try { await loadReviews(); showStatus("reviewStatus", "Ulasan diperbarui."); } catch(e) { showStatus("reviewStatus", showError("Gagal memuat ulasan",e)); } });
$("reviewsAdminList")?.addEventListener("click", async event => {
  const button = event.target.closest("button[data-id]"); if (!button) return;
  const item = reviews.find(r => r.id === button.dataset.id); if (!item) return;
  if (button.classList.contains("edit-review")) {
    const f = $("reviewForm"); getFormValue(f,"id").value=item.id; getFormValue(f,"customerName").value=item.customerName||""; getFormValue(f,"platform").value=item.platform||""; getFormValue(f,"rating").value=String(item.rating||5); getFormValue(f,"message").value=item.message||""; getFormValue(f,"active").checked=item.active!==false; f.scrollIntoView({behavior:"smooth",block:"center"});
  }
  if (button.classList.contains("delete-review") && confirm("Hapus ulasan ini? Data like terkait tidak ikut dihapus.")) {
    try { button.disabled=true; await deleteDoc(doc(db,"reviews",item.id)); await loadReviews(); showStatus("reviewStatus","Ulasan dihapus. Like lama tetap berada di database untuk audit."); }
    catch(error) { showStatus("reviewStatus",showError("Gagal menghapus ulasan",error)); button.disabled=false; }
  }
});

$("reviewsAdminList")?.addEventListener("click",async event=>{const b=event.target.closest(".save-admin-likes");if(!b)return;const id=b.dataset.id,input=document.querySelector(`.admin-like-count[data-id="${CSS.escape(id)}"]`),count=Math.floor(Number(input?.value));if(!Number.isFinite(count)||count<0||count>100000000){showStatus("reviewStatus","Angka Like harus 0 sampai 100.000.000.");return;}b.disabled=true;try{await setDoc(doc(db,"reviewLikeAdjustments",id),{count,updatedAt:serverTimestamp(),updatedBy:auth.currentUser?.uid||""},{merge:true});await loadReviews();showStatus("reviewStatus","Penyesuaian Like admin tersimpan di Firestore.");logActivity("Mengubah penyesuaian Like review");}catch(e){showStatus("reviewStatus",showError("Gagal menyimpan angka Like",e));}finally{b.disabled=false;}});

// FINAL ULTIMATE 50: design controls, diagnostics, reports and operational helpers.
const capabilityNames = [
"Admin login Firebase","Pemeriksaan UID admin","Dashboard ringkasan","Penghitungan pesanan","Penghitungan layanan","Penghitungan paket","Ringkasan pesanan baru","Ringkasan pesanan selesai","Ringkasan nilai pesanan","Edit profil brand","Edit judul hero","Edit deskripsi hero","Edit email kontak","Edit Instagram","Edit WhatsApp","Maintenance mode","Maintenance countdown","CRUD katalog IT","Aktif/nonaktif layanan","CRUD paket boosting","Edit platform boosting","Edit kuantitas paket","Edit harga paket","Edit garansi paket","Daftar order Firebase","Ubah status order","Pencarian order","Filter status order","Refresh order","Tetapkan nominal tagihan","Ubah status pembayaran","Tulis instruksi pembayaran","Export CSV order","Kode order unik sisi browser","Matrix Rain","Starfield","Snowfall","Cyber particles","Preset tema","Warna aksen","Kontrol kecepatan efek","Kontrol kepadatan efek","Kontrol glow","Toggle scanline","Toggle grid","Toggle motion","Edit monogram","Analytics status","Layanan populer","Rasio penyelesaian","Monitor halaman dari browser","Tes baca Firestore","Backup JSON katalog","Restore konfigurasi situs","Export katalog CSV","Activity log sesi lokal","Layout responsif admin","Dashboard akun pelanggan","Registrasi pelanggan","Login pelanggan","Logout pelanggan","Daftar pesanan milik akun","Refresh riwayat pelanggan","Pemesanan dengan akun","Penyimpanan UID pelanggan","Validasi nomor WhatsApp","Validasi detail pesanan","Persetujuan kepemilikan/izin","Status menunggu penawaran","Status menunggu pembayaran","Status pembayaran lunas","Catatan pembayaran per order","Tagihan per order","Instruksi transfer per order","Katalog layanan IT","Katalog paket sosial","Tautan order dari kartu layanan","Tautan order dari kartu paket","FAQ layanan","Kontak email","Kontak WhatsApp","Kontak Instagram","Halaman maintenance","Pengaturan pembayaran manual","Proteksi data pelanggan per UID","Akses baca order oleh admin","Akses update order oleh admin","Akses CRUD katalog oleh admin","Aturan catch-all deny","Tidak meminta password akun sosial","Peringatan jangan kirim OTP","Peringatan scope security berizin","Riwayat status pesanan","Pencarian nama pelanggan","Pencarian nomor pelanggan","Pencarian kode order","Pencarian detail order","Ekspor data pesanan","Ekspor katalog layanan","Timestamp pembaruan order"
];
const capGrid = $("capabilityGrid");
if (capGrid) capGrid.innerHTML = capabilityNames.map((name,i)=>`<div class="capability-item"><span>${String(i+1).padStart(2,"0")}</span>${esc(name)}</div>`).join("");
let localActivity=[];
function logActivity(message){
  const at = new Date().toLocaleString("id-ID");
  localActivity.unshift({at,message}); localActivity=localActivity.slice(0,30);
  const box=$("activityLog");
  if(box) box.innerHTML=localActivity.map(x=>`<div><small>${esc(x.at)}</small>${esc(x.message)}</div>`).join("")||"<p>Belum ada aktivitas.</p>";
  // Best-effort persistent audit trail. Firestore rules restrict writes to enabled admins.
  if(auth.currentUser) addDoc(collection(db,"adminLogs"),{
    uid:auth.currentUser.uid, email:auth.currentUser.email||"", action:String(message).slice(0,240),
    createdAt:serverTimestamp()
  }).catch(err=>console.warn("Audit log tidak tersimpan:",err.code||err.message));
}
function navigatePane(id){document.querySelectorAll(".admin-tab").forEach(t=>t.classList.toggle("active",t.dataset.pane===id));document.querySelectorAll(".admin-pane").forEach(p=>p.classList.toggle("hidden",p.id!==id));}
document.addEventListener("click",e=>{const b=e.target.closest("[data-jump]");if(b){navigatePane(b.dataset.jump);$(b.dataset.jump)?.scrollIntoView({behavior:"smooth",block:"start"});}});
function fillDesignForm(data={}){const f=$("designForm");if(!f)return;for(const [k,v] of Object.entries({theme:"matrix",layout:"cyber",effect:"matrix",accent:"#79f2a0",accent2:"#58d9ff",speed:5,density:55,glow:"medium",motion:true,scanline:true,grid:true,logoText:"K//",...data})){const el=f.elements.namedItem(k);if(el){if(el.type==="checkbox")el.checked=v===true;else el.value=v??"";}}$("speedOutput").textContent=f.elements.speed.value;$("densityOutput").textContent=f.elements.density.value;}
const designDefaults={theme:"matrix",layout:"cyber",effect:"matrix",accent:"#79f2a0",accent2:"#58d9ff",speed:5,density:55,glow:"medium",motion:true,scanline:true,grid:true,logoText:"K"};
const originalRefreshAll=refreshAll;
// Load saved visual config after the existing site document has been loaded.
const _refreshAllUltimate=refreshAll;
// Wrap refresh in a microtask to keep the original Firebase loading path intact.
setTimeout(async()=>{try{const snap=await getDoc(doc(db,"siteConfig","main"));if(snap.exists())fillDesignForm({...designDefaults,...(snap.data().design||{})});else fillDesignForm();}catch(e){console.warn("Design settings load:",e);fillDesignForm();}},1200);
async function readCurrentDesign(){const snap=await getDoc(doc(db,"siteConfig","main"));return snap.exists()?(snap.data().design||{}):{};}
function collectDesignForm(){const f=$("designForm"),d={};for(const key of Object.keys(designDefaults)){const el=f?.elements.namedItem(key);d[key]=el?.type==="checkbox"?el.checked:el?.type==="range"?Number(el.value):el?.value;}return d;}
function previewSelectedLayout(){const layout=$("designForm")?.elements.namedItem("layout")?.value||"cyber";const preview=$("layoutPreview");if(!preview)return;preview.dataset.layout=layout;preview.style.setProperty("--lp-accent",$("designForm")?.elements.namedItem("accent")?.value||"#79f2a0");preview.style.setProperty("--lp-accent2",$("designForm")?.elements.namedItem("accent2")?.value||"#58d9ff");preview.classList.remove("preview-refresh");void preview.offsetWidth;preview.classList.add("preview-refresh");const title=preview.querySelector(".layout-preview-hero h3");if(title)title.textContent=({cyber:"Secure your digital future.",saas:"A smarter workspace for growth.",business:"Digital excellence, delivered.",glass:"Clarity meets innovation.",matrix:"ACCESS. BUILD. SECURE.",editorial:"Technology with intention.",aurora:"Move forward with confidence.",neon:"Make your next move visible.",royal:"A premium digital standard.",minimal:"Less noise. Better systems.",hologram:"Beyond the ordinary interface.",quantum:"Precision for a connected world.",emerald:"Reliable technology, refined.",midnight:"Built for the next generation.",frost:"A clearer way to work.",sunset:"Ideas into digital momentum.",terminal:"SYSTEM READY_",titanium:"Strength in every solution.",orbit:"Your digital world, connected.",adaptive:"Designed around your environment."})[layout]||"Build your digital presence.";}
$("designForm")?.elements.namedItem("layout")?.addEventListener("change",previewSelectedLayout);["accent","accent2"].forEach(k=>$("designForm")?.elements.namedItem(k)?.addEventListener("input",previewSelectedLayout));
$("previewLayout")?.addEventListener("click",()=>{previewSelectedLayout();showStatus("designStatus","Preview layout diperbarui. Belum diterapkan ke website publik.");});
$("designForm")?.addEventListener("submit",async e=>{e.preventDefault();const f=e.currentTarget,btn=f.querySelector('button[type="submit"]')||f.querySelector('button:not([type])'),d=collectDesignForm();if(btn)btn.disabled=true;showStatus("designStatus","Menyimpan desain dan riwayat sebelumnya...");try{const ref=doc(db,"siteConfig","main"),snap=await getDoc(ref),old=snap.exists()?(snap.data().design||{}):{};await setDoc(ref,{design:d,previousDesign:Object.keys(old).length?old:designDefaults},{merge:true});showStatus("designStatus","Layout dan desain berhasil disimpan. Website publik menerapkannya saat dimuat ulang.");previewSelectedLayout();logActivity("Mengubah tema dan layout website");}catch(err){showStatus("designStatus",showError("Gagal menyimpan desain",err));}finally{if(btn)btn.disabled=false;}});
$("restorePreviousLayout")?.addEventListener("click",async()=>{const b=$("restorePreviousLayout");b.disabled=true;showStatus("designStatus","Mengambil tampilan sebelumnya...");try{const ref=doc(db,"siteConfig","main"),snap=await getDoc(ref),data=snap.exists()?snap.data():{},previous=data.previousDesign;if(!previous||typeof previous!=="object")throw new Error("Belum ada riwayat tampilan sebelumnya. Simpan perubahan tema terlebih dahulu.");const current=data.design||designDefaults;await setDoc(ref,{design:previous,previousDesign:current},{merge:true});fillDesignForm({...designDefaults,...previous});previewSelectedLayout();showStatus("designStatus","Tampilan sebelumnya berhasil dipulihkan. Muat ulang website publik untuk melihat hasilnya.");logActivity("Memulihkan tampilan website sebelumnya");}catch(err){showStatus("designStatus",showError("Gagal memulihkan tampilan",err));}finally{b.disabled=false;}});
$("restoreDefaultLayout")?.addEventListener("click",async()=>{if(!confirm("Kembalikan tema dan layout website ke desain awal Kenseonn?"))return;const b=$("restoreDefaultLayout");b.disabled=true;showStatus("designStatus","Mengembalikan desain awal...");try{const ref=doc(db,"siteConfig","main"),snap=await getDoc(ref),data=snap.exists()?snap.data():{},current=data.design||designDefaults,defaults={...designDefaults};await setDoc(ref,{design:defaults,previousDesign:current},{merge:true});fillDesignForm(defaults);previewSelectedLayout();showStatus("designStatus","Desain awal berhasil dipulihkan. Muat ulang website publik untuk menerapkannya.");logActivity("Restore default website layout");}catch(err){showStatus("designStatus",showError("Restore default gagal",err));}finally{b.disabled=false;}});
["speed","density"].forEach(k=>$("designForm")?.elements.namedItem(k)?.addEventListener("input",e=>{$(k+"Output").textContent=e.target.value;}));
$("previewEffect")?.addEventListener("click",()=>{const f=$("designForm"),box=$("effectPreview");box.dataset.effect=f.elements.effect.value;box.style.setProperty("--preview-accent",f.elements.accent.value);box.querySelector("span").textContent=`PREVIEW: ${f.elements.effect.value.toUpperCase()} • SPEED ${f.elements.speed.value}`;logActivity("Menjalankan preview efek lokal");});
function csvDownload(name,rows){const csv=rows.map(r=>r.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\r\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download=name;a.click();URL.revokeObjectURL(a.href);}
function dateValue(v){try{return v?.toDate?v.toDate().toLocaleString("id-ID"):"";}catch{return "";}}
function renderOrderTools(){
 const q=($("orderSearch")?.value||"").toLowerCase(),st=$("orderFilter")?.value||"all";
 const archivedOnly=$("showArchivedOrders")?.checked===true;
 const filtered=orders.filter(o=>(archivedOnly?o.archived===true:o.archived!==true)&&(st==="all"||o.status===st)&&[o.name,o.phone,o.service,o.orderCode,o.details].some(v=>String(v||"").toLowerCase().includes(q)));
 const c=$("ordersAdminList");if(!c)return;
 c.innerHTML=filtered.map(item=>`<div class="order-row order-row-expanded"><div>
 <b>${esc(item.orderCode||item.id)} · ${esc(item.name||"Tanpa nama")} — ${esc(item.service||"")}</b>
 <small>${esc(item.phone||"")} ${item.email?"· "+esc(item.email):""} · ${esc(dateValue(item.createdAt))}</small><p>${esc(item.details||"")}</p>
 <div class="order-admin-controls">
 <label>Status order<select class="status-select" data-id="${esc(item.id)}">${["new","contacted","paid","processing","done","cancelled"].map(status=>`<option value="${status}" ${item.status===status?"selected":""}>${status}</option>`).join("")}</select></label>
 <label>Status pembayaran<select class="payment-status-select" data-id="${esc(item.id)}">${["awaiting_quote","awaiting_payment","paid","rejected","refunded"].map(status=>`<option value="${status}" ${(item.paymentStatus||"awaiting_quote")===status?"selected":""}>${status}</option>`).join("")}</select></label>
 <label>Total tagihan (Rp)<input class="order-price-input" data-id="${esc(item.id)}" type="number" min="0" step="1000" value="${Number(item.price)||0}"></label>
 <label class="payment-note-field">Instruksi pembayaran<input class="payment-note-input" data-id="${esc(item.id)}" maxlength="500" value="${esc(item.paymentNote||"")}" placeholder="Transfer ke ..."></label>
 <button type="button" class="btn small save-order-payment" data-id="${esc(item.id)}">Simpan pembayaran</button>
          ${["done","cancelled"].includes(item.status) && !item.archived ? `<button type="button" class="btn small archive-order" data-id="${esc(item.id)}">Arsipkan</button>` : ""}${item.archived ? `<button type="button" class="btn small restore-order" data-id="${esc(item.id)}">Pulihkan</button>` : ""}
 </div></div></div>`).join("")||'<p class="muted-note">Tidak ada pesanan yang cocok.</p>';
}
$("orderSearch")?.addEventListener("input",renderOrderTools);$("orderFilter")?.addEventListener("change",renderOrderTools);$("showArchivedOrders")?.addEventListener("change",renderOrderTools);
$("exportOrders")?.addEventListener("click",()=>{csvDownload("kenseonn-orders.csv",[["Order ID","Kode","Nama","WhatsApp","Email","Layanan","Detail","Status","Dibuat"],...orders.map(o=>[o.id,o.orderCode,o.name,o.phone,o.email,o.service,o.details,o.status,dateValue(o.createdAt)])]);logActivity("Export data pesanan CSV");});
$("exportCatalog")?.addEventListener("click",()=>{csvDownload("kenseonn-catalog.csv",[["Type","ID","Name/platform","Description/qty","Price","Guarantee","Active"],...services.map(x=>["service",x.id,x.name,x.description,"","",x.active!==false]),...packages.map(x=>["package",x.id,x.platform,x.qty,x.price,x.guarantee,true])]);logActivity("Export katalog CSV");});
function renderAnalytics(){const total=orders.length,done=orders.filter(o=>o.status==="done").length,active=orders.filter(o=>["new","contacted","paid","processing"].includes(o.status)).length;$("anaTotal").textContent=total;$("anaActive").textContent=active;$("anaDone").textContent=done;$("anaRate").textContent=(total?Math.round(done/total*100):0)+"%";const counts={};orders.forEach(o=>counts[o.status||"unknown"]=(counts[o.status||"unknown"]||0)+1);$("statusBars").innerHTML=Object.entries(counts).map(([k,v])=>`<div class="bar-row"><span>${esc(k)}</span><div><i style="width:${total?v/total*100:0}%"></i></div><b>${v}</b></div>`).join("")||"Belum ada data.";const popular={};orders.forEach(o=>popular[o.service||"Tidak diketahui"]=(popular[o.service||"Tidak diketahui"]||0)+1);$("popularServices").innerHTML=Object.entries(popular).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([k,v])=>`<div class="admin-row"><b>${esc(k)}</b><span>${v} order</span></div>`).join("")||"Belum ada pesanan.";$("statNew").textContent=orders.filter(o=>o.status==="new").length;$("statDone").textContent=done;$("statRevenue").textContent="Rp "+money(orders.filter(o=>["paid","done"].includes(o.status)).reduce((sum,o)=>sum+Number(o.price||0),0));}
$("refreshAnalytics")?.addEventListener("click",async()=>{try{await loadOrders();renderAnalytics();logActivity("Refresh analytics");}catch(e){alert(showError("Analytics gagal dimuat",e));}});
$("runMonitor")?.addEventListener("click",async()=>{const out=$("monitorResult");out.textContent="Memeriksa...";const start=performance.now();try{const res=await fetch("./",{cache:"no-store"});out.textContent=`HTTP ${res.status} · ${Math.round(performance.now()-start)} ms`;logActivity("Monitor website dijalankan");}catch(e){out.textContent="Gagal dijangkau dari browser ini";}});
$("runFirebaseCheck")?.addEventListener("click",async()=>{const out=$("firebaseResult");out.textContent="Memeriksa...";try{await getDoc(doc(db,"siteConfig","main"));out.textContent="Firestore read OK";logActivity("Tes koneksi Firestore berhasil");}catch(e){out.textContent=`Gagal: ${e.code||e.message}`;}});
$("backupData")?.addEventListener("click",async()=>{try{const [siteSnap,s,p]=await Promise.all([getDoc(doc(db,"siteConfig","main")),getDocs(collection(db,"services")),getDocs(collection(db,"packages"))]);const payload={schema:"kenseonn-backup-v1",createdAt:new Date().toISOString(),site:siteSnap.data()||{},services:s.docs.map(d=>({id:d.id,...d.data()})),packages:p.docs.map(d=>({id:d.id,...d.data()}))};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));a.download="kenseonn-backup.json";a.click();URL.revokeObjectURL(a.href);logActivity("Backup JSON diunduh");}catch(e){alert(showError("Backup gagal",e));}});
$("restoreData")?.addEventListener("click",async()=>{const file=$("restoreFile")?.files?.[0];if(!file){alert("Pilih file backup JSON terlebih dahulu.");return;}if(!confirm("Restore akan menggabungkan konfigurasi ke siteConfig/main. Lanjutkan?"))return;try{const data=JSON.parse(await file.text());if(data.schema!=="kenseonn-backup-v1"||!data.site||typeof data.site!=="object")throw new Error("Format backup tidak dikenali");await setDoc(doc(db,"siteConfig","main"),data.site,{merge:true});alert("Konfigurasi berhasil direstore. Layanan dan paket tidak ditimpa otomatis demi keamanan.");logActivity("Restore konfigurasi website");}catch(e){alert(showError("Restore gagal",e));}});
$("clearActivity")?.addEventListener("click",()=>{localActivity=[];$("activityLog").innerHTML="<p>Log lokal dibersihkan.</p>";});
// Recompute overview whenever original loaders finish and after status updates.
const _loadOrdersUltimate=loadOrders;
loadOrders=async function(){await _loadOrdersUltimate();renderAnalytics();renderOrderTools();};
const _loadServicesUltimate=loadServices;
loadServices=async function(){await _loadServicesUltimate();};
const _loadPackagesUltimate=loadPackages;
loadPackages=async function(){await _loadPackagesUltimate();};


// LIVE ADMIN DATA + PERSISTENT AUDIT LOGS
async function loadAdminLogs(){
  const snap = await getDocs(query(collection(db,"adminLogs"), orderBy("createdAt","desc")));
  adminLogs = snap.docs.map(d=>({id:d.id,...d.data()}));
  renderAdminLogs();
}
function renderAdminLogs(){
  const host=$("adminLogsList"); if(!host)return;
  host.innerHTML=adminLogs.slice(0,100).map(item=>`<article class="audit-log-row"><div><b>${esc(item.action||"Aktivitas admin")}</b><small>${esc(item.email||item.uid||"Admin")} · ${esc(item.uid||"")}</small></div><small>${esc(dateValue(item.createdAt)||"Waktu tidak tersedia")}</small></article>`).join("") || '<p class="muted-note">Belum ada catatan aktivitas tersimpan.</p>';
}
$("refreshAdminLogs")?.addEventListener("click",async()=>{const b=$("refreshAdminLogs");setBusy(b,true);try{await loadAdminLogs();}catch(e){alert(showError("Gagal memuat audit log",e));}finally{setBusy(b,false);}});
function startLiveAdminFeeds(){
  liveUnsubscribers.forEach(fn=>{try{fn();}catch{}}); liveUnsubscribers=[];
  if(!auth.currentUser)return;
  const feed=(path,callback)=>{const unsub=onSnapshot(collection(db,path),snap=>callback(snap),err=>console.warn(`Live ${path}:`,err.code||err.message));liveUnsubscribers.push(unsub);};
  // Real-time listener only for admin-readable collections; no writes are performed here.
  feed("orders",snap=>{orders=snap.docs.map(d=>({id:d.id,...d.data()}));renderOrderTools();renderAnalytics();});
  feed("services",snap=>{services=snap.docs.map(d=>({id:d.id,...d.data()}));showStatus("statServices",services.length);renderServices();});
  feed("packages",snap=>{packages=snap.docs.map(d=>({id:d.id,...d.data()}));showStatus("statPackages",packages.length);renderPackages();});
  feed("supportTickets",snap=>{supportTickets=snap.docs.map(d=>({id:d.id,...d.data()}));renderTickets();});
  feed("reviews",snap=>{reviews=snap.docs.map(d=>({id:d.id,...d.data()}));renderReviewsAdmin();});
  feed("reviewLikes",snap=>{reviewLikeCounts={};snap.docs.forEach(d=>{const rid=d.data().reviewId;if(rid)reviewLikeCounts[rid]=(reviewLikeCounts[rid]||0)+1;});renderReviewsAdmin();});
  feed("adminLogs",snap=>{adminLogs=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>{const av=a.createdAt?.toMillis?.()||0,bv=b.createdAt?.toMillis?.()||0;return bv-av;});renderAdminLogs();});
}

// DIAGNOSTIK FRONT-END: pemeriksaan runtime ringan, bukan pemindai keamanan server.
$("runDiagnostics")?.addEventListener("click", async () => {
  const out = $("diagnosticsResult"), list = $("diagnosticsList");
  out.textContent = "Memindai..."; list.innerHTML = "";
  const checks = [];
  const check = (name, ok, detail) => checks.push({name, ok, detail});
  ["loginForm","loginEmail","loginPassword","dashboard","customersAdminList","ordersAdminList","siteForm","serviceForm","packageForm"].forEach(id => check(`Elemen #${id}`, !!$(id), $(id) ? "Ditemukan" : "Tidak ditemukan"));
  check("Firebase Auth aktif", !!auth.currentUser, auth.currentUser ? "Sesi pengguna tersedia" : "Belum ada sesi pengguna");
  check("Admin login handler", !!$("loginForm") && !!$("loginForm").querySelector('[type="submit"]'), "Form dan tombol submit tersedia");
  try { await getDoc(doc(db,"siteConfig","main")); check("Firestore read", true, "Dokumen siteConfig/main dapat dibaca"); } catch(e) { check("Firestore read", false, `${e.code || e.message}`); }
  check("Database member", true, "Tidak digunakan: sistem memakai pesanan tamu tanpa akun pelanggan.");
  try { await getDocs(query(collection(db,"supportTickets"), orderBy("createdAt", "desc"))); check("Database tiket bantuan", true, "Koleksi supportTickets dapat dibaca admin."); } catch(e) { check("Database tiket bantuan", false, `${e.code || e.message}`); }
  try { await getDocs(query(collection(db,"orders"), orderBy("createdAt", "desc"))); check("Database pesanan", true, "Koleksi orders dapat dibaca admin."); } catch(e) { check("Database pesanan", false, `${e.code || e.message}`); }
  const failed = checks.filter(x => !x.ok).length;
  out.textContent = `${checks.length - failed}/${checks.length} pemeriksaan lolos · ${failed} masalah`;
  list.innerHTML = checks.map(x => `<div class="diagnostic-row"><b>${x.ok ? "✓" : "✕"} ${esc(x.name)}</b><small>${esc(x.detail)}</small></div>`).join("");
  logActivity(`Diagnostik dijalankan: ${failed} masalah dari ${checks.length} pemeriksaan`);
});


// Kenseonn Ultimate: admin-controlled feature flags and design presets.
const featureDefaults = {registrationEnabled:true, orderingEnabled:true, maintenanceEnabled:false, publicCatalogEnabled:true};
async function loadFeatureManager(){
  const snap=await getDoc(doc(db,"siteConfig","main"));
  const data=snap.exists()?snap.data():{};
  const flags={...featureDefaults,...Object.fromEntries(Object.keys(featureDefaults).map(k=>[k,data[k]!==undefined?data[k]:featureDefaults[k]]))};
  const form=$("featureForm"); if(!form)return;
  Object.entries(flags).forEach(([k,v])=>{const el=form.elements.namedItem(k);if(el)el.checked=v===true;});
}
$("featureForm")?.addEventListener("submit",async e=>{
  e.preventDefault(); const form=e.currentTarget, btn=form.querySelector('[type="submit"]');
  const flags={}; Object.keys(featureDefaults).forEach(k=>flags[k]=form.elements.namedItem(k).checked);
  btn.disabled=true; showStatus("featureStatus","Menyimpan...");
  try{
    await setDoc(doc(db,"siteConfig","main"),flags,{merge:true});
    showStatus("featureStatus","Pengaturan fitur tersimpan.");
    logActivity("Memperbarui Feature Manager");
  }catch(err){showStatus("featureStatus",showError("Gagal menyimpan fitur",err));}
  finally{btn.disabled=false;}
});
const presetDesigns={
 matrix:{effect:"matrix",accent:"#79f2a0",accent2:"#58d9ff",glow:"medium",scanline:true,grid:true},
 aurora:{effect:"particles",accent:"#8be7ff",accent2:"#b9a4ff",glow:"high",scanline:false,grid:true},
 violet:{effect:"stars",accent:"#c69aff",accent2:"#64dcff",glow:"high",scanline:true,grid:false},
 ember:{effect:"snow",accent:"#ff9a67",accent2:"#ffd36e",glow:"medium",scanline:false,grid:true},
 mono:{effect:"grid",accent:"#d5e0eb",accent2:"#91a2b5",glow:"low",scanline:false,grid:true}
};
$("designForm")?.elements.namedItem("theme")?.addEventListener("change",e=>{
 const preset=presetDesigns[e.target.value]; if(!preset)return;
 const f=$("designForm"); Object.entries(preset).forEach(([k,v])=>{const el=f.elements.namedItem(k);if(el){if(el.type==="checkbox")el.checked=v;else el.value=v;}});
 $("previewEffect")?.click();
});
refreshAll=async function(){
  await _refreshAllUltimate();
  const tasks = await Promise.allSettled([loadFeatureManager(), loadCustomers(), loadAdminLogs()]);
  tasks.forEach((result, index) => { if (result.status === "rejected") console.warn(["Feature Manager","Customer directory","Audit log"][index], result.reason); });
  startLiveAdminFeeds();
}


// ENTERPRISE COMMAND SUITE — 20 admin-managed modules backed by Firestore records.
const enterpriseModules = [
 {id:'profit-loss',name:'Profit & Loss Center',desc:'Ringkasan laba/rugi berbasis order dan catatan biaya.',kind:'Finance'},
 {id:'financial-ledger',name:'Financial Ledger',desc:'Catat pemasukan dan pengeluaran bisnis.',kind:'Finance'},
 {id:'smart-pricing',name:'Smart Pricing Engine',desc:'Simpan aturan harga, modal, margin, dan harga jual.',kind:'Commerce'},
 {id:'sales-forecast',name:'Sales Forecast',desc:'Catat target dan proyeksi penjualan; bukan prediksi otomatis tanpa data historis.',kind:'Analytics'},
 {id:'abandoned-orders',name:'Abandoned Order Recovery',desc:'Daftar order yang perlu ditindaklanjuti dan status follow-up.',kind:'Customer'},
 {id:'live-chat',name:'Live Chat Center',desc:'Inbox/catatan percakapan support. Chat realtime publik butuh widget dan kanal pelanggan.',kind:'Customer'},
 {id:'loyalty',name:'Customer Loyalty',desc:'Kelola level, poin, dan penyesuaian reward pelanggan.',kind:'Customer'},
 {id:'referrals',name:'Referral Program',desc:'Kelola kode referral dan reward yang telah diverifikasi.',kind:'Marketing'},
 {id:'disputes',name:'Complaint & Dispute Center',desc:'Catat komplain, bukti, penanggung jawab, dan penyelesaian.',kind:'Customer'},
 {id:'segments',name:'Customer Segmentation',desc:'Simpan segmen pelanggan dan kriteria pengelompokan.',kind:'Customer'},
 {id:'provider-api',name:'Multi-Provider API Manager',desc:'Daftar endpoint dan konfigurasi non-rahasia provider; secret wajib di server.',kind:'Integration'},
 {id:'provider-health',name:'Provider Health Monitor',desc:'Catat hasil pemeriksaan provider dan waktu gangguan.',kind:'Integration'},
 {id:'provider-failover',name:'Auto Provider Failover',desc:'Atur kebijakan provider cadangan; eksekusi otomatis butuh backend worker.',kind:'Integration'},
 {id:'order-tracking',name:'Order Tracking Engine',desc:'Catat referensi eksternal dan progres order/provider.',kind:'Commerce'},
 {id:'refund-refill',name:'Refund & Refill Manager',desc:'Kelola permintaan refund/refill dan keputusan admin.',kind:'Finance'},
 {id:'admin-roles',name:'Multi-Admin Role Matrix',desc:'Catat matriks tugas admin. Enforcement hak akses perlu rules/backend role-aware.',kind:'Security'},
 {id:'two-factor',name:'Two-Factor Security',desc:'Checklist status kebijakan 2FA. Aktivasi 2FA harus dilakukan melalui Firebase Auth/provider.',kind:'Security'},
 {id:'fraud-cases',name:'Fraud Detection Cases',desc:'Tandai pola transaksi mencurigakan untuk pemeriksaan manual.',kind:'Security'},
 {id:'recovery',name:'Database Recovery Center',desc:'Catat backup, verifikasi, dan pemulihan; backup ini bukan pengganti export Firebase penuh.',kind:'System'},
 {id:'performance',name:'System Performance Monitor',desc:'Catat pengukuran performa dan insiden runtime dari pemeriksaan admin.',kind:'System'}
];
let activeEnterpriseModule = null;
let enterpriseRecords = [];
function renderEnterpriseModules(){
 const host=$('enterpriseModuleGrid'); if(!host)return;
 host.innerHTML=enterpriseModules.map(m=>`<button type="button" class="enterprise-module-card ${activeEnterpriseModule===m.id?'active':''}" data-enterprise-module="${m.id}"><small>${esc(m.kind)}</small><b>${esc(m.name)}</b><span>${esc(m.desc)}</span></button>`).join('');
 host.querySelectorAll('[data-enterprise-module]').forEach(btn=>btn.addEventListener('click',()=>selectEnterpriseModule(btn.dataset.enterpriseModule)));
}
function resetEnterpriseForm(){const f=$('enterpriseRecordForm');if(!f)return;f.reset();f.elements.namedItem('id').value='';f.elements.namedItem('enabled').checked=true;}
async function selectEnterpriseModule(id){
 const module=enterpriseModules.find(x=>x.id===id); if(!module)return;
 activeEnterpriseModule=id; renderEnterpriseModules();
 $('enterpriseModuleKicker').textContent=`${module.kind.toUpperCase()} / FIRESTORE`;
 $('enterpriseModuleTitle').textContent=module.name; $('enterpriseModuleDesc').textContent=module.desc;
 resetEnterpriseForm(); await loadEnterpriseRecords();
}
async function loadEnterpriseRecords(){
 if(!activeEnterpriseModule)return;
 const host=$('enterpriseRecordsList'); host.innerHTML='<p class="muted-note">Memuat data dari Firestore...</p>';
 try{
  const snap=await getDocs(query(collection(db,'enterpriseRecords'),orderBy('updatedAt','desc')));
  enterpriseRecords=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.module===activeEnterpriseModule);
  renderEnterpriseRecords();
 }catch(e){host.innerHTML=`<p class="error-note">Gagal membaca data: ${esc(e.code||e.message)}</p>`;}
}
function renderEnterpriseRecords(){
 const host=$('enterpriseRecordsList'); if(!host)return;
 const q=($('enterpriseSearch')?.value||'').trim().toLowerCase();
 const rows=enterpriseRecords.filter(x=>`${x.title||''} ${x.reference||''} ${x.notes||''} ${x.status||''}`.toLowerCase().includes(q));
 host.innerHTML=rows.map(x=>`<article class="enterprise-record"><div class="enterprise-record-main"><b>${esc(x.title||'Tanpa judul')}</b><small>${esc(x.status||'pending')} · ${x.amount!==null&&x.amount!==undefined?'Rp '+money(x.amount):'Tanpa nominal'} · ${esc(x.reference||'Tanpa referensi')}</small><p>${esc(x.notes||'Tidak ada catatan')}</p></div><div class="enterprise-record-actions"><button class="btn ghost" type="button" data-enterprise-edit="${x.id}">Edit</button><button class="btn danger" type="button" data-enterprise-delete="${x.id}">Hapus</button></div></article>`).join('')||'<p class="muted-note">Belum ada data untuk modul ini.</p>';
 host.querySelectorAll('[data-enterprise-edit]').forEach(b=>b.addEventListener('click',()=>{const x=enterpriseRecords.find(r=>r.id===b.dataset.enterpriseEdit);if(!x)return;const f=$('enterpriseRecordForm');f.elements.namedItem('id').value=x.id;f.elements.namedItem('title').value=x.title||'';f.elements.namedItem('status').value=x.status||'pending';f.elements.namedItem('amount').value=x.amount??'';f.elements.namedItem('reference').value=x.reference||'';f.elements.namedItem('notes').value=x.notes||'';f.elements.namedItem('enabled').checked=x.enabled!==false;f.scrollIntoView({behavior:'smooth',block:'center'});}));
 host.querySelectorAll('[data-enterprise-delete]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Hapus catatan ini dari Firestore?'))return;try{await deleteDoc(doc(db,'enterpriseRecords',b.dataset.enterpriseDelete));logActivity(`Menghapus data ${activeEnterpriseModule}`);await loadEnterpriseRecords();}catch(e){showStatus('enterpriseStatus',showError('Gagal menghapus data',e));}}));
}
$('enterpriseRecordForm')?.addEventListener('submit',async e=>{
 e.preventDefault(); if(!activeEnterpriseModule){showStatus('enterpriseStatus','Pilih modul terlebih dahulu.');return;}
 const f=e.currentTarget,b=f.querySelector('[type="submit"]'); setBusy(b,true);
 const data={module:activeEnterpriseModule,title:f.elements.namedItem('title').value.trim(),status:f.elements.namedItem('status').value,amount:f.elements.namedItem('amount').value===''?null:Number(f.elements.namedItem('amount').value),reference:f.elements.namedItem('reference').value.trim(),notes:f.elements.namedItem('notes').value.trim(),enabled:f.elements.namedItem('enabled').checked,updatedAt:serverTimestamp(),updatedBy:auth.currentUser?.uid||null};
 try{const id=f.elements.namedItem('id').value;if(id){await updateDoc(doc(db,'enterpriseRecords',id),data);}else{data.createdAt=serverTimestamp();data.createdBy=auth.currentUser?.uid||null;await addDoc(collection(db,'enterpriseRecords'),data);}showStatus('enterpriseStatus','Data berhasil disimpan ke Firestore.');logActivity(`Menyimpan ${activeEnterpriseModule}: ${data.title}`);resetEnterpriseForm();await loadEnterpriseRecords();}
 catch(err){showStatus('enterpriseStatus',showError('Gagal menyimpan data enterprise',err));}finally{setBusy(b,false);}
});
$('enterpriseRefresh')?.addEventListener('click',loadEnterpriseRecords);
$('enterpriseReset')?.addEventListener('click',resetEnterpriseForm);
$('enterpriseSearch')?.addEventListener('input',renderEnterpriseRecords);

renderEnterpriseModules();


// BRAND LOGO STUDIO — saved to the existing public site configuration.
const logoForm=$("brandLogoForm");
function updateBrandPreview(){if(!logoForm)return;const name=logoForm.elements.name.value.trim()||"KENSEONN",mark=logoForm.elements.mark.value.trim()||"K",style=logoForm.elements.style.value;const icon=$("adminBrandPreview");icon.dataset.logo=style;$("adminBrandPreviewText").textContent=mark;$("adminBrandPreviewName").textContent=name;}
if(logoForm){logoForm.addEventListener("input",updateBrandPreview);logoForm.addEventListener("change",updateBrandPreview);(async()=>{try{const snap=await getDoc(doc(db,"siteConfig","main"));const b=snap.exists()?snap.data().brandLogo||{}:{};logoForm.elements.name.value=b.name||"KENSEONN";logoForm.elements.mark.value=b.mark||"K";logoForm.elements.style.value=String(b.style??0);updateBrandPreview();}catch(e){showStatus("brandLogoStatus",showError("Gagal memuat logo",e));}})();logoForm.addEventListener("submit",async e=>{e.preventDefault();const btn=logoForm.querySelector('[type="submit"]'),brandLogo={name:logoForm.elements.name.value.trim(),mark:logoForm.elements.mark.value.trim(),style:Number(logoForm.elements.style.value)};if(!brandLogo.name||!brandLogo.mark)return;btn.disabled=true;try{await setDoc(doc(db,"siteConfig","main"),{brandLogo},{merge:true});showStatus("brandLogoStatus","Logo dan nama brand tersimpan di Firestore. Muat ulang website publik untuk menerapkan.");logActivity("Memperbarui identitas logo Kenseonn");}catch(err){showStatus("brandLogoStatus",showError("Gagal menyimpan logo",err));}finally{btn.disabled=false;}});}
$("resetBrandLogo")?.addEventListener("click",async()=>{if(!confirm("Reset logo dan nama brand ke identitas awal KENSEONN?"))return;try{await setDoc(doc(db,"siteConfig","main"),{brandLogo:{name:"KENSEONN",mark:"K",style:0}},{merge:true});logoForm.elements.name.value="KENSEONN";logoForm.elements.mark.value="K";logoForm.elements.style.value="0";updateBrandPreview();showStatus("brandLogoStatus","Logo awal berhasil dipulihkan.");logActivity("Reset logo brand");}catch(e){showStatus("brandLogoStatus",showError("Reset logo gagal",e));}});

// Admin appearance: 20 genuinely distinct panel skins, persisted locally for the admin browser.
const adminSkinNames=["obsidian","aurora","royal","ocean","emerald","sunset","ice","carbon","cyber","minimal","gold","crimson","matrix","hologram","navy","lavender","mint","copper","mono","adaptive"];
function applyAdminSkin(name,announce=true){const skin=adminSkinNames.includes(name)?name:"obsidian";document.body.dataset.adminSkin=skin;try{localStorage.setItem("kenseonnAdminSkin",skin);}catch(e){}const sel=$("adminSkinSelect");if(sel)sel.value=skin;const pv=$("adminSkinPreview");if(pv)pv.dataset.skin=skin;if(announce&&$("adminSkinStatus"))$("adminSkinStatus").textContent="Layout admin diterapkan dan tersimpan pada browser ini.";}
(()=>{let saved="obsidian";try{saved=localStorage.getItem("kenseonnAdminSkin")||"obsidian";}catch(e){}applyAdminSkin(saved,false);})();
$("adminSkinSelect")?.addEventListener("change",e=>{const pv=$("adminSkinPreview");if(pv)pv.dataset.skin=e.target.value;});
$("applyAdminSkin")?.addEventListener("click",()=>applyAdminSkin($("adminSkinSelect")?.value||"obsidian"));
$("resetAdminSkin")?.addEventListener("click",()=>applyAdminSkin("obsidian"));

// Expanded system diagnostics: real browser checks and Firestore reads, not decorative status labels.
$("runSystemDeepCheck")?.addEventListener("click",async()=>{const out=$("systemDeepResult");out.textContent="Menjalankan pemeriksaan...";const checks=[];const test=(name,ok,detail)=>checks.push({name,ok,detail});test("Firebase Auth session",!!auth.currentUser,auth.currentUser?"Admin session aktif":"Tidak ada sesi admin aktif");try{const checksData=await Promise.allSettled([getDoc(doc(db,"siteConfig","main")),getDocs(collection(db,"services")),getDocs(collection(db,"packages")),getDocs(collection(db,"reviews")),getDocs(collection(db,"reviewLikes")),getDocs(collection(db,"orders")),getDocs(collection(db,"supportTickets")),getDocs(collection(db,"enterpriseRecords")),getDocs(collection(db,"adminLogs"))]);const labels=["Site configuration","Services","Packages","Reviews","Review Like events","Orders","Support tickets","Enterprise records","Admin audit logs"];checksData.forEach((r,i)=>{const ok=r.status==="fulfilled";const val=ok?(i===0?(r.value.exists()?"Dokumen siteConfig/main tersedia":"Dokumen belum dibuat"):(`${r.value.size} dokumen/event`)):(r.reason?.code||r.reason?.message||"Gagal dibaca");test(labels[i],ok && (i!==0||r.value.exists()),val);});}catch(e){test("Firestore diagnostics",false,e.code||e.message);}try{const paths=["index.html","styles.css","app.js","admin.html","admin.js","admin-premium.css","firebase-config.js"];const assetResults=await Promise.all(paths.map(async p=>{const r=await fetch(p,{cache:"no-store"});return {p,ok:r.ok,status:r.status};}));assetResults.forEach(x=>test("Asset "+x.p,x.ok,x.ok?"HTTP "+x.status:"HTTP "+x.status+" — periksa deploy/path"));}catch(e){test("Website assets",false,e.message||"Fetch gagal");}test("Browser storage",!!window.sessionStorage&&!!window.localStorage,"Storage browser tersedia");test("Reduced motion support",!!window.matchMedia,"Preferensi aksesibilitas dapat diperiksa");out.innerHTML=checks.map(c=>`<div class="diagnostic-row"><b>${c.ok?"✓":"✕"} ${esc(c.name)}</b><small>${esc(c.detail)}</small></div>`).join("");logActivity("Menjalankan deep system check");});


// PRESIDENTIAL SUITE MOTION LAYER
(function initPresidentialMotion(){
  const loader = document.getElementById('presidentialLoader');
  const showLoader = () => { if(loader){ loader.classList.add('is-active'); } };
  const hideLoader = () => { if(loader){ loader.classList.remove('is-active'); } };
  window.addEventListener('load',()=>setTimeout(hideLoader,450),{once:true});
  document.addEventListener('click',event=>{
    const target=event.target.closest('button,a,[data-pane]');
    if(!target)return;
    if(target.matches('button[type="submit"]') || target.id==='logoutBtn' || target.classList.contains('admin-tab')){
      showLoader(); setTimeout(hideLoader,650);
    }
    const rect=target.getBoundingClientRect();
    const size=Math.max(rect.width,rect.height)*1.25;
    const ripple=document.createElement('span');
    ripple.className='pres-ripple';
    ripple.style.width=ripple.style.height=size+'px';
    ripple.style.left=(event.clientX-rect.left-size/2)+'px';
    ripple.style.top=(event.clientY-rect.top-size/2)+'px';
    if(getComputedStyle(target).position==='static')target.style.position='relative';
    target.appendChild(ripple);setTimeout(()=>ripple.remove(),700);
  },{passive:true});
  if('IntersectionObserver' in window){
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('motion-ready');observer.unobserve(entry.target);}
    }),{threshold:.08,rootMargin:'0px 0px -35px 0px'});
    const selector='.admin-card,.glass-stat,.glass-panel,.tool-card,.enterprise-module-card';
    const seen=new WeakSet();
    const scan=node=>{if(node.nodeType!==1)return;if(node.matches?.(selector)&&!seen.has(node)){seen.add(node);observer.observe(node);}node.querySelectorAll?.(selector).forEach(el=>{if(!seen.has(el)){seen.add(el);observer.observe(el);}});};
    scan(document.documentElement);
    new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(scan))).observe(document.body,{childList:true,subtree:true});
  }
})();

// ADMIN DATA VAULT: destructive operations require two explicit confirmations.
const bulkDeleteLabels={orders:'seluruh pesanan',supportTickets:'seluruh tiket bantuan',customers:'seluruh profil pelanggan',reviews:'seluruh ulasan',services:'seluruh layanan',packages:'seluruh paket',enterpriseRecords:'seluruh catatan Enterprise',reviewLikes:'seluruh riwayat Like',adminLogs:'seluruh Audit Log'};
async function clearFirestoreCollection(collectionName){
  const label=bulkDeleteLabels[collectionName];
  if(!label || !auth.currentUser) throw new Error('Aksi tidak tersedia atau sesi admin tidak aktif.');
  const first=confirm(`PERINGATAN: Kamu akan menghapus ${label} dari Firestore. Tindakan ini permanen. Unduh backup terlebih dahulu. Lanjutkan?`);
  if(!first)return;
  const second=prompt(`Konfirmasi kedua. Ketik HAPUS untuk menghapus ${label}.`);
  if(second!=='HAPUS')return;
  const status=$('dataVaultStatus');
  if(status)status.textContent=`Memuat ${label}...`;
  const snap=await getDocs(collection(db,collectionName));
  let deleted=0;
  const docs=snap.docs;
  for(let i=0;i<docs.length;i+=20){
    const group=docs.slice(i,i+20);
    await Promise.all(group.map(item=>deleteDoc(doc(db,collectionName,item.id))));
    deleted+=group.length;
    if(status)status.textContent=`Menghapus ${label}: ${deleted}/${docs.length}...`;
  }
  if(status)status.textContent=`Selesai. ${deleted} dokumen dihapus dari ${collectionName}.`;
  if(collectionName!=='adminLogs') logActivity(`Menghapus ${deleted} dokumen dari ${collectionName}`);
  if(collectionName==='orders')await loadOrders();
  if(collectionName==='services')await loadServices();
  if(collectionName==='packages')await loadPackages();
  if(collectionName==='supportTickets')await loadTickets();
  if(collectionName==='reviews')await loadReviews();
  if(collectionName==='adminLogs')await loadAdminLogs();
  if(collectionName==='enterpriseRecords')await loadEnterpriseRecords();
  if(collectionName==='reviewLikes')await loadReviews();
  if(collectionName==='customers' && typeof loadCustomers==='function')await loadCustomers();
}
document.querySelectorAll('[data-clear-collection]').forEach(button=>button.addEventListener('click',async()=>{
  const name=button.dataset.clearCollection;
  const idle=button.textContent;button.disabled=true;button.textContent='Memproses...';
  try{await clearFirestoreCollection(name);}catch(error){showStatus('dataVaultStatus',showError('Penghapusan gagal',error));}
  finally{button.disabled=false;button.textContent=idle;}
}));
