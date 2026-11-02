import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  addDoc,
  setDoc,
  deleteDoc,
  query,
  serverTimestamp,
  where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, signInAnonymously, updateProfile, sendPasswordResetEmail, sendEmailVerification, reload, applyActionCode, verifyPasswordResetCode, confirmPasswordReset } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const emailVerificationSettings = {
  url: "https://kendevelopersecurity.github.io/kenseonn-it-service/?emailVerification=1",
  handleCodeInApp: false
};
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
let currentCustomer = null;
// Separate identity for review likes; anonymous visitors never become customer-dashboard users.
let currentLikeUser = null;
let anonymousSignInPending = false;
let registrationEnabled = true;
const loginCooldownKey = "kenseonn_customer_login_until";

const fallbackServices = [
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
].map(([id, icon, name, description]) => ({ id, icon, name, description, active: true }));

// Paket dan harga tidak dibuat otomatis. Admin wajib memasukkan harga yang benar.
const fallbackPackages = [];

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

let services = [];
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

function setGlobalLoading(show, message = "Memproses permintaan...") {
  const overlay = byId("globalLoading");
  if (!overlay) return;
  const label = byId("globalLoadingText");
  if (label) label.textContent = message;
  overlay.classList.toggle("hidden", !show);
  document.body.classList.toggle("is-loading", show);
}

function showOrderStatus(message, success = false) {
  const el = byId("orderStatus");
  if (!el) return;
  el.textContent = message;
  el.setAttribute("role", "status");
  el.style.color = success ? "#86ffad" : "#ffb4b4";
}

async function loadData() {
  try {
    const [serviceSnap, packageSnap, siteSnap] = await Promise.all([
      getDocs(collection(db, "services")),
      getDocs(collection(db, "packages")),
      getDoc(doc(db, "siteConfig", "main"))
    ]);

    services = serviceSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(s => s.active !== false);

    if (!packageSnap.empty) {
      packages = packageSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
    }

    if (siteSnap.exists()) {
      site = { ...fallbackSite, ...siteSnap.data() };
    }
    registrationEnabled = site.registrationEnabled !== false;
    const orderFormEl = byId("orderForm");
    if (orderFormEl) orderFormEl.classList.toggle("hidden", site.orderingEnabled === false);
    const catalogEl = byId("servicesGrid");
    if (catalogEl) catalogEl.classList.toggle("hidden", site.publicCatalogEnabled === false);
  } catch (err) {
    console.error("Gagal memuat data website:", err);
    showOrderStatus(
      "Katalog online belum dapat dimuat. Silakan muat ulang atau hubungi admin."
    );
  }

  render();
  renderReviews();
  applyDesign();
  const paymentBox = byId("paymentInstructions");
  if (paymentBox) {
    const method = [site.paymentMethod, site.paymentRecipient, site.paymentAccount].filter(Boolean).join(" · ");
    paymentBox.textContent = [method, site.paymentInstructions].filter(Boolean).join(" — ") || "Instruksi pembayaran akan diberikan admin setelah nominal dikonfirmasi.";
  }
}

function render() {
  applyMaintenance();
  const registerForm = byId("registerForm");
  const registerNotice = byId("registrationDisabledNotice");
  if (registerForm) registerForm.classList.toggle("hidden", !registrationEnabled);
  if (registerNotice) registerNotice.classList.toggle("hidden", registrationEnabled);

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

  const platformOrder = ["instagram","tiktok","facebook","youtube","telegram","x","threads","whatsapp","linkedin","spotify","twitch","snapchat","pinterest","reddit","discord","soundcloud","kick","medium","quora"];
  const platforms = [...new Set([...platformOrder, ...packages.map(p => String(p.platform || "").toLowerCase())])];
  const tabs = byId("platformTabs");
  if (tabs) {
    const labels = {instagram:"Instagram",tiktok:"TikTok",facebook:"Facebook",youtube:"YouTube",telegram:"Telegram",x:"X",threads:"Threads",whatsapp:"WhatsApp",linkedin:"LinkedIn",spotify:"Spotify",twitch:"Twitch",snapchat:"Snapchat",pinterest:"Pinterest",reddit:"Reddit",discord:"Discord",soundcloud:"SoundCloud",kick:"Kick",medium:"Medium",quora:"Quora"};
    tabs.innerHTML = platforms.map((key,i) => `<button class="tab ${i===0?"active":""}" data-platform="${esc(key)}">${esc(labels[key] || key.toUpperCase())}</button>`).join("");
    tabs.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
      tabs.querySelectorAll("button").forEach(t => t.classList.toggle("active", t===button));
      renderPackages(button.dataset.platform);
    }));
  }
  renderPackages(platforms[0] || "instagram");
}

function describeBoost(platform, type, qty, guarantee) {
  const key = String(type || "Followers").toLowerCase();
  const templates = {
    followers: `Paket followers ${platform} untuk membantu memperluas social proof profil dan mendukung pertumbuhan akun.`,
    likes: `Paket likes ${platform} untuk mendukung interaksi pada konten publik yang kamu tentukan.`,
    views: `Paket views ${platform} untuk mendukung jangkauan tayangan konten.`,
    comments: `Paket komentar ${platform}; format dan ketentuan komentar wajib dikonfirmasi admin sebelum proses.`,
    shares: `Paket shares ${platform} untuk membantu distribusi konten.`,
    subscribers: `Paket subscribers ${platform} untuk mendukung pertumbuhan kanal.`,
    members: `Paket members ${platform} untuk komunitas atau kanal yang sesuai ketentuan platform.`,
    saves: `Paket saves ${platform} untuk mendukung interaksi simpan pada konten.`,
    reactions: `Paket reactions ${platform} untuk mendukung interaksi pada postingan.`
  };
  return `${templates[key] || `Paket ${type} ${platform} dengan verifikasi order manual.`} Jumlah: ${qty}. Ketentuan refill: ${guarantee || "lihat konfirmasi admin"}.`;
}

function renderPackages(platform) {
  const grid = byId("packagesGrid");
  if (!grid) return;
  const list = packages
    .filter(p => String(p.platform || "").toLowerCase() === String(platform || "").toLowerCase() && p.active !== false)
    .sort((a,b) => (parseInt(a.qty,10)||0) - (parseInt(b.qty,10)||0));
  if (!list.length) {
    grid.innerHTML = '<div class="reviews-empty"><h3>Paket belum tersedia</h3><p>Admin belum menerbitkan paket aktif untuk platform ini. Tidak ada harga contoh yang ditampilkan.</p></div>';
    return;
  }
  const order = ["Followers","Likes","Views","Comments","Shares","Subscribers","Members","Saves","Reactions"];
  const types = [...new Set(list.map(p => p.type || "Followers"))].sort((a,b) => (order.indexOf(a)<0?99:order.indexOf(a)) - (order.indexOf(b)<0?99:order.indexOf(b)));
  grid.innerHTML = types.map(type => {
    const cards = list.filter(p => (p.type || "Followers") === type).map(p => {
      const desc = p.description || describeBoost(platform, type, p.qty, p.guarantee);
      const serviceName = `${platform} ${type} ${p.qty}`;
      return `<article class="price-card premium-price-card"><div class="package-topline"><span class="price-platform">${esc(String(platform).toUpperCase())}</span><span class="package-status">● ADMIN VERIFIED</span></div><h4>${esc(p.qty)} ${esc(type)}</h4><p class="package-description">${esc(desc)}</p><div class="price">Rp ${money(p.price)}</div><div class="package-benefits"><span>✓ Garansi: ${esc(p.guarantee || "sesuai konfirmasi")}</span><span>✓ Konfirmasi admin sebelum bayar</span><span>✓ Bantuan jika ada kendala</span></div><button type="button" class="btn primary full order-package" data-service="${esc(serviceName)}" data-description="${esc(desc)}" data-platform="${esc(platform)}" data-type="${esc(type)}" data-qty="${esc(p.qty)}">Pilih paket →</button></article>`;
    }).join("");
    return `<section class="boost-type-group"><div class="boost-type-heading"><span class="boost-type-icon">${({Followers:"◎",Likes:"♥",Views:"▶",Comments:"✎",Shares:"↗",Subscribers:"✦",Members:"◈",Saves:"▣",Reactions:"✧"})[type] || "✦"}</span><div><h3>${esc(type)} ${esc(String(platform).toUpperCase())}</h3><p>Pilih jumlah dan ketentuan paket yang tersedia</p></div></div><div class="boost-package-grid">${cards}</div></section>`;
  }).join("");
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


document.addEventListener("click", event => {
  const button = event.target.closest(".order-service, .order-package");
  if (!button) return;

  const select = byId("serviceSelect");
  const form = byId("orderForm");
  if (!select || !form) return;

  const requested = button.dataset.service || "";
  setGlobalLoading(true, "Menyiapkan detail layanan...");
  button.disabled = true;
  const idleLabel = button.innerHTML;
  button.innerHTML = '<span class="button-spinner"></span> Menyiapkan...';
  window.setTimeout(() => { button.disabled = false; button.innerHTML = idleLabel; setGlobalLoading(false); }, 650);

  if (![...select.options].some(option => option.value === requested)) {
    const option = document.createElement("option");
    option.value = requested;
    option.textContent = requested;
    select.appendChild(option);
  }

  select.value = requested;
  const detailsField = form.querySelector('[name="details"]');
  if (detailsField && button.dataset.description) detailsField.value = `Platform: ${button.dataset.platform || ""}\nJenis layanan: ${button.dataset.type || ""}\nJumlah: ${button.dataset.qty || ""}\nDeskripsi: ${button.dataset.description}\nTautan publik akun/konten: `;
  location.hash = "order";
  form.scrollIntoView({ behavior: "smooth", block: "center" });
});

const authGuest = byId("authGuest");
const customerDashboard = byId("customerDashboard");
const setText = (id, value) => { const el = byId(id); if (el) el.textContent = value ?? ""; };

async function refreshCustomerOrders() {
  if (!currentCustomer) return;
  const target = byId("customerOrders");
  if (!target) return;
  target.innerHTML = '<p class="muted-note">Memuat pesanan...</p>';
  try {
    const snap = await getDocs(query(collection(db, "orders"), where("uid", "==", currentCustomer.uid)));
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    target.innerHTML = items.filter(o => !o.archived).map(o => { const stages = ["new","contacted","paid","processing","done"]; const current = stages.indexOf(o.status); return `<article class="customer-order-card"><div class="order-card-head"><b>${esc(o.orderCode || o.id)}</b><span class="status-chip">${esc(o.status || "new")}</span></div><h4>${esc(o.service || "Layanan")}</h4><p>${esc(o.details || "")}</p><div class="order-timeline">${stages.map((st,i)=>`<span class="${current >= i ? "reached" : ""}">${st}</span>`).join("")}</div><div class="order-meta"><span>Pembayaran: <b>${esc(o.paymentStatus || "awaiting_quote")}</b></span><span>Tagihan: <b>Rp ${money(o.price || 0)}</b></span></div>${o.paymentNote ? `<p class="payment-note">${esc(o.paymentNote)}</p>` : ""}<div class="order-actions"><button type="button" class="btn ghost copy-order-code" data-code="${esc(o.orderCode || o.id)}">Salin kode order</button></div><small>Dibuat: ${esc(o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString("id-ID") : "Baru saja")}</small></article>`; }).join("") || '<p class="muted-note">Belum ada pesanan. Pilih layanan untuk memulai.</p>';
  } catch (err) { target.innerHTML = `<p class="form-status">Gagal memuat pesanan: ${esc(err.code || err.message)}</p>`; }
}

onAuthStateChanged(auth, async authUser => {
  try {
    if (!authUser) {
      currentCustomer = null;
      currentLikeUser = null;
      if (authGuest) authGuest.classList.remove("hidden");
      if (customerDashboard) customerDashboard.classList.add("hidden");
      renderReviews();
      const emailField = document.querySelector('#orderForm [name="email"]');
      if (emailField) emailField.readOnly = false;
      // Give each public visitor a persistent anonymous Firebase UID for one-like-per-browser identity.
      if (!anonymousSignInPending) {
        anonymousSignInPending = true;
        try { await signInAnonymously(auth); }
        catch (error) {
          console.error("Firebase Anonymous Authentication gagal:", error);
          setText("customerLoginStatus", `Like pengunjung belum tersedia: ${error.code || error.message}. Admin perlu mengaktifkan Anonymous di Firebase Authentication.`);
        } finally { anonymousSignInPending = false; }
      }
      return;
    }
    const user = authUser;
    currentLikeUser = user;
    // Anonymous sessions are only for review likes; do not expose the customer dashboard or order account.
    if (user.isAnonymous) {
      currentCustomer = null;
      if (authGuest) authGuest.classList.remove("hidden");
      if (customerDashboard) customerDashboard.classList.add("hidden");
      const emailField = document.querySelector('#orderForm [name="email"]');
      if (emailField) emailField.readOnly = false;
      renderReviews();
      return;
    }
    // Refresh the Firebase user before deciding whether to show the dashboard.
    await reload(user);
    currentLikeUser = auth.currentUser || user;
    currentCustomer = currentLikeUser;
    if (!currentCustomer.emailVerified) {
      if (authGuest) authGuest.classList.remove("hidden");
      if (customerDashboard) customerDashboard.classList.add("hidden");
      setText("customerLoginStatus", "Email belum diverifikasi. Buka tautan verifikasi terbaru di Gmail, lalu login kembali.");
      renderReviews();
      return;
    }
    if (authGuest) authGuest.classList.add("hidden");
    if (customerDashboard) customerDashboard.classList.remove("hidden");
    setText("customerName", user.displayName || "Pelanggan Kenseonn");
    setText("customerEmail", user.email || "");
    const emailField = document.querySelector('#orderForm [name="email"]');
    if (emailField) { emailField.value = user.email || ""; emailField.readOnly = false; }
    const nameField = document.querySelector('#orderForm [name="name"]');
    if (nameField && user.displayName && !nameField.value) nameField.value = user.displayName;
    await refreshCustomerOrders();
    renderReviews();
  } catch (err) {
    console.error("Customer session/dashboard error:", err);
    setText("customerLoginStatus", `Sesi masuk terdeteksi, tetapi dashboard gagal dimuat: ${err.code || err.message}`);
    if (authGuest) authGuest.classList.remove("hidden");
    if (customerDashboard) customerDashboard.classList.add("hidden");
  }
});

byId("registerForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  if (!registrationEnabled) { setText("registerStatus", "Pendaftaran akun sedang ditutup oleh admin."); return; }
  const form = event.currentTarget, data = new FormData(form), button = form.querySelector('[type="submit"]');
  if (button.disabled) return;
  try {
    button.disabled = true; setText("registerStatus", "Membuat akun...");
    const credential = await createUserWithEmailAndPassword(auth, String(data.get("email")).trim(), String(data.get("password")));
    await updateProfile(credential.user, { displayName: String(data.get("name")).trim() });
    // Kirim email verifikasi lebih dulu agar kegagalan tulis profil Firestore
    // tidak membuat pengguna kehilangan kesempatan menerima tautan verifikasi.
    await sendEmailVerification(credential.user, emailVerificationSettings);
    try {
      await setDoc(doc(db, "customers", credential.user.uid), {
        name: String(data.get("name")).trim(),
        email: credential.user.email,
        emailVerified: false,
        createdAt: serverTimestamp()
      }, { merge: true });
    } catch (profileError) {
      console.error("Profil pelanggan belum tersimpan:", profileError);
    }
    await signOut(auth);
    form.reset();
    setText("registerStatus", "Akun berhasil dibuat dan tautan verifikasi baru telah dikirim. Gunakan tautan TERBARU dari email Firebase. Jika tautan lama kedaluwarsa, abaikan dan buka email terbaru. Periksa Spam/Promosi.");
  } catch(err) {
    const messages = {
      "auth/email-already-in-use": "Email sudah terdaftar. Masuk menggunakan akun tersebut.",
      "auth/invalid-email": "Format email tidak valid.",
      "auth/weak-password": "Password terlalu lemah. Gunakan minimal 8 karakter.",
      "auth/operation-not-allowed": "Pendaftaran Email/Password belum diaktifkan di Firebase Authentication.",
      "auth/unauthorized-continue-uri": "Domain tautan verifikasi belum diizinkan. Tambahkan kendevelopersecurity.github.io ke Authorized domains Firebase Authentication.",
      "auth/too-many-requests": "Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba lagi."
    };
    setText("registerStatus", `Pendaftaran gagal: ${messages[err.code] || err.code || err.message}`);
    if (auth.currentUser) await signOut(auth).catch(() => {});
  }
  finally { button.disabled = false; }
});

byId("customerLoginForm")?.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget, data = new FormData(form), button = form.querySelector('[type="submit"]');
  const until = Number(sessionStorage.getItem(loginCooldownKey) || 0), remaining = until - Date.now();
  if (remaining > 0) { setText("customerLoginStatus", `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(remaining/60000)} menit.`); return; }
  if (button.disabled) return;
  try {
    button.disabled = true;
    setText("customerLoginStatus", "Memproses login...");
    const credential = await signInWithEmailAndPassword(auth, String(data.get("email")).trim(), String(data.get("password")));
    await reload(credential.user);
    if (!credential.user.emailVerified) {
      try {
        await sendEmailVerification(credential.user, emailVerificationSettings);
        await signOut(auth);
        setText("customerLoginStatus", "Email belum terverifikasi. Kami baru saja mengirim ulang tautan verifikasi. Gunakan email TERBARU dari Firebase; tautan lama yang kedaluwarsa tidak bisa dipakai.");
      } catch (mailError) {
        await signOut(auth).catch(() => {});
        setText("customerLoginStatus", `Email belum terverifikasi dan pengiriman ulang gagal: ${mailError.code || mailError.message}. Periksa Authorized domains Firebase.`);
      }
      return;
    }
    // Profile sync is best-effort; Firestore profile failure must not undo Firebase Auth login.
    try {
      await setDoc(doc(db, "customers", credential.user.uid), { email: credential.user.email, emailVerified: true, updatedAt: serverTimestamp() }, { merge: true });
    } catch (profileError) {
      console.warn("Login OK; customer profile sync pending:", profileError);
      setText("customerLoginStatus", "Login berhasil. Profil belum tersinkron ke database; dashboard tetap dibuka.");
    }
    sessionStorage.removeItem(loginCooldownKey);
    form.reset();
    if (!byId("customerLoginStatus")?.textContent.includes("Profil belum tersinkron")) setText("customerLoginStatus", "Login berhasil.");
  }
  catch(err) {
    if (err.code === "auth/too-many-requests") sessionStorage.setItem(loginCooldownKey, String(Date.now()+15*60*1000));
    const messages = {"auth/too-many-requests":"Firebase membatasi percobaan sementara. Tunggu 15 menit sebelum mencoba lagi.","auth/invalid-credential":"Email atau password tidak sesuai.","auth/user-not-found":"Akun tidak ditemukan.","auth/wrong-password":"Password tidak benar.","auth/network-request-failed":"Koneksi internet bermasalah."};
    setText("customerLoginStatus", messages[err.code] || `Login gagal: ${err.code || err.message}`);
  } finally { button.disabled = false; }
});
byId("customerLogout")?.addEventListener("click", () => signOut(auth));
byId("customerResetPassword")?.addEventListener("click", async () => {
  const email = document.querySelector('#customerLoginForm [name="email"]')?.value.trim();
  if (!email) { setText("customerLoginStatus", "Isi email akun terlebih dahulu, lalu tekan Lupa password."); return; }
  try {
    await sendPasswordResetEmail(auth, email, { url: "https://kendevelopersecurity.github.io/kenseonn-it-service/", handleCodeInApp: false });
    setText("customerLoginStatus", "Email reset dikirim. Buka email PALING BARU dan gunakan tautan satu kali sebelum kedaluwarsa. Jangan gunakan tautan lama.");
  } catch (err) { setText("customerLoginStatus", `Gagal mengirim reset: ${err.code || err.message}`); }
});

// Support Firebase action links when the email template redirects directly to this site.
async function handleFirebaseActionLink() {
  const params = new URLSearchParams(location.search);
  const mode = params.get("mode"), code = params.get("oobCode");
  if (!mode || !code) return;
  const panel = byId("firebaseActionPanel");
  const form = byId("firebaseResetForm");
  if (panel) panel.classList.remove("hidden");
  if (mode === "verifyEmail") {
    try {
      await applyActionCode(auth, code);
      setText("firebaseActionStatus", "Email berhasil diverifikasi. Sekarang silakan masuk menggunakan akun pelanggan.");
    } catch (err) { setText("firebaseActionStatus", `Tautan verifikasi tidak berlaku atau sudah digunakan (${err.code || "error"}). Minta tautan verifikasi baru dari halaman login.`); }
  } else if (mode === "resetPassword") {
    if (form) form.classList.remove("hidden");
    try {
      const email = await verifyPasswordResetCode(auth, code);
      setText("firebaseActionStatus", `Atur password baru untuk ${email}.`);
      form?.addEventListener("submit", async event => {
        event.preventDefault();
        const password = byId("firebaseNewPassword")?.value || "";
        if (password.length < 8) { setText("firebaseActionStatus", "Password minimal 8 karakter."); return; }
        try {
          await confirmPasswordReset(auth, code, password);
          setText("firebaseActionStatus", "Password berhasil diubah. Silakan kembali ke form login.");
          form.reset(); form.classList.add("hidden");
        } catch (err) { setText("firebaseActionStatus", `Gagal menyimpan password: ${err.code || err.message}`); }
      }, { once: true });
    } catch (err) { if (form) form.classList.add("hidden"); setText("firebaseActionStatus", `Tautan reset sudah kedaluwarsa atau pernah digunakan (${err.code || "auth/invalid-action-code"}). Kirim ulang permintaan reset dan gunakan email terbaru.`); }
  } else {
    setText("firebaseActionStatus", "Jenis tautan Firebase tidak didukung.");
  }
}
handleFirebaseActionLink();
byId("refreshCustomerOrders")?.addEventListener("click", refreshCustomerOrders);
document.addEventListener("click", event => { const b = event.target.closest(".copy-order-code"); if (!b) return; navigator.clipboard?.writeText(b.dataset.code || "").then(() => setText("registerStatus", "Kode pesanan disalin.")).catch(() => setText("registerStatus", "Tidak dapat menyalin otomatis; salin kode secara manual.")); });

const orderForm = byId("orderForm");
if (orderForm) orderForm.addEventListener("submit", async event => {
  event.preventDefault();
  const form = event.currentTarget, button = form.querySelector('[type="submit"]');
  if (!form.reportValidity() || button.disabled) return;
  const f = new FormData(form);
  const name = String(f.get("name")||"").trim();
  const phone = String(f.get("phone")||"").trim();
  const email = String(f.get("email")||"").trim().toLowerCase();
  const service = String(f.get("service")||"").trim();
  const details = String(f.get("details")||"").trim();
  const consent = form.querySelector('[type="checkbox"]');
  if(name.length<2 || phone.replace(/\D/g,"").length<7 || !email || !service || details.length<5){showOrderStatus("Periksa nama, WhatsApp, email, layanan, dan detail pesanan.");return;}
  if(consent && !consent.checked){showOrderStatus("Centang persetujuan sebelum mengirim pesanan.");return;}
  const orderCode = `KN-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const payload = { uid:null, name, phone, email, service, details, status:"new", paymentStatus:"awaiting_quote", price:0, paymentNote:"Menunggu admin mengonfirmasi total tagihan dan instruksi pembayaran.", orderCode, source:"guest-order-v5", createdAt:serverTimestamp() };
  try { button.disabled=true; setGlobalLoading(true, "Mengirim pesanan ke database..."); button.dataset.idleHtml=button.innerHTML; button.innerHTML='<span class="button-spinner"></span> Mengirim...'; showOrderStatus("Mengirim pesanan..."); await addDoc(collection(db,"orders"),payload); showOrderStatus(`Pesanan berhasil dikirim. Simpan kode ${orderCode}. Admin akan menghubungi Anda.`,true); form.reset(); }
  catch(err){ console.error("Guest order failed",err); showOrderStatus(`Pesanan gagal dikirim (${err.code||err.message}). Hubungi admin melalui WhatsApp.`); }
  finally {button.disabled=false; setGlobalLoading(false); if(button.dataset.idleHtml){button.innerHTML=button.dataset.idleHtml;delete button.dataset.idleHtml;}}
});

const ticketForm = byId("ticketForm");
if(ticketForm) ticketForm.addEventListener("submit", async event=>{
  event.preventDefault(); const form=event.currentTarget, button=form.querySelector('[type="submit"]'); if(!form.reportValidity()||button.disabled)return;
  const f=new FormData(form); const ticketCode=`KT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const data={ticketCode,name:String(f.get('name')||'').trim(),email:String(f.get('email')||'').trim().toLowerCase(),phone:String(f.get('phone')||'').trim(),category:String(f.get('category')||'Perlu bantuan'),message:String(f.get('message')||'').trim(),status:'open',createdAt:serverTimestamp(),source:'public-helpdesk-v5'};
  try{button.disabled=true;button.dataset.idleHtml=button.innerHTML;button.innerHTML='<span class="button-spinner"></span> Mengirim...';setGlobalLoading(true,"Mengirim tiket bantuan...");byId('ticketStatus').textContent='Mengirim tiket...';await addDoc(collection(db,'supportTickets'),data);byId('ticketStatus').textContent=`Tiket terkirim. Simpan kode ${ticketCode}; admin akan menghubungi kontak Anda.`;form.reset();}
  catch(err){console.error(err);byId('ticketStatus').textContent=`Tiket gagal dikirim (${err.code||err.message}).`;}finally{button.disabled=false;setGlobalLoading(false);if(button.dataset.idleHtml){button.innerHTML=button.dataset.idleHtml;delete button.dataset.idleHtml;}}
});

loadData();


// VISUAL ENGINE: matrix rain, starfield, snowfall and particles (reduced-motion aware).
function applyDesign() {
  const d = site.design || {};
  const allowedLayouts = ["cyber", "saas", "business", "glass", "matrix", "editorial"];
  document.body.dataset.siteLayout = allowedLayouts.includes(d.layout) ? d.layout : "cyber";
  const themes = {matrix:["#79f2a0","#58d9ff","#070b10"],aurora:["#8be7ff","#b9a4ff","#07101a"],violet:["#c69aff","#64dcff","#0c0715"],ember:["#ff9a67","#ffd36e","#100a08"],mono:["#d5e0eb","#91a2b5","#080b0f"]};
  const palette = themes[d.theme] || themes.matrix;
  const accent = d.accent || palette[0], accent2 = d.accent2 || palette[1];
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent2", accent2);
  document.documentElement.style.setProperty("--bg", palette[2]);
  document.body.classList.toggle("no-motion", d.motion === false);
  document.body.classList.toggle("no-scanline", d.scanline === false);
  document.body.classList.toggle("no-grid", d.grid === false);
  document.documentElement.style.setProperty("--glow-strength", d.glow === "high" ? ".34" : d.glow === "low" ? ".06" : ".18");
  const mark = document.querySelector(".brand-mark"); if (mark && d.logoText) mark.textContent = d.logoText;
  startVisualEffect(d);
}
let fxFrame = 0;
function startVisualEffect(settings={}) {
  const canvas = byId("fxCanvas"); if (!canvas) return;
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  cancelAnimationFrame(fxFrame);
  const effect = settings.effect || "matrix", speed = Math.max(1,Math.min(10,Number(settings.speed)||5));
  const density = Math.max(10,Math.min(150,Number(settings.density)||55));
  const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (settings.motion === false || reduced || effect === "none") { ctx.clearRect(0,0,canvas.width,canvas.height); return; }
  let w=0,h=0,items=[];
  const resize=()=>{w=canvas.width=window.innerWidth*devicePixelRatio;h=canvas.height=window.innerHeight*devicePixelRatio;canvas.style.width="100%";canvas.style.height="100%";items=Array.from({length:density},()=>({x:Math.random()*w,y:Math.random()*h,z:.3+Math.random()*1.4,v:(.4+Math.random()*1.4)*speed*.22,r:Math.random()*2+0.5}));};
  resize(); window.addEventListener("resize",resize,{passive:true});
  const tick=()=>{ctx.clearRect(0,0,w,h);const accent=settings.accent||"#79f2a0";items.forEach((p,i)=>{p.y+=p.v*(effect==="snow"?1.1:1);p.x+=effect==="snow"?Math.sin((p.y+i)*.006)*.35:effect==="particles"?Math.cos((p.y+i)*.01)*.3:0;if(p.y>h+8){p.y=-8;p.x=Math.random()*w;}if(effect==="matrix"){ctx.fillStyle=accent;ctx.globalAlpha=.16+p.z*.28;ctx.font=`${12*p.z*devicePixelRatio}px monospace`;ctx.fillText(Math.random()>.5?"1":"0",p.x,p.y);}else{ctx.globalAlpha=.15+p.z*.38;ctx.fillStyle=effect==="snow"?"#dff5ff":effect==="stars"?"#d7eaff":accent;ctx.beginPath();ctx.arc(p.x,p.y,p.r*p.z*devicePixelRatio,0,Math.PI*2);ctx.fill();}});ctx.globalAlpha=1;fxFrame=requestAnimationFrame(tick);};
  tick();
}

// Ulasan asli dari Firestore. Like memakai dokumen unik per UID, bukan angka demo/local.
async function renderReviews() {
  const grid = byId("reviewsGrid");
  if (!grid) return;
  grid.innerHTML = '<div class="review-loading"><span class="inline-spinner"></span> Mengambil ulasan dari database...</div>';
  try {
    const snap = await getDocs(query(collection(db, "reviews"), where("active", "==", true)));
    const rows = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    if (!rows.length) {
      grid.innerHTML = '<div class="reviews-empty"><span>✦</span><h3>Belum ada ulasan terverifikasi</h3><p>Ulasan akan muncul setelah admin memasukkan feedback pelanggan yang benar-benar diterima.</p></div>';
      return;
    }
    const user = currentCustomer;
    const cards = await Promise.all(rows.map(async review => {
      const likesSnap = await getDocs(query(collection(db, "reviewLikes"), where("reviewId", "==", review.id)));
      let liked = false;
      if (user) liked = (await getDoc(doc(db, "reviewLikes", `${review.id}_${user.uid}`))).exists();
      const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));
      return `<article class="review-card"><div class="review-card-top"><span class="review-avatar">${esc((review.customerName || "P").trim().charAt(0).toUpperCase())}</span><div><b>${esc(review.customerName || "Pelanggan")}</b><small>${esc(review.platform || "Layanan Kenseonn")}</small></div><span class="review-verified">✓ Dikelola admin</span></div><div class="review-stars" aria-label="Rating ${rating} dari 5">${"★".repeat(rating)}${"☆".repeat(5-rating)}</div><p>${esc(review.message || "")}</p><button class="review-like ${liked ? "liked" : ""}" type="button" data-review-id="${esc(review.id)}" aria-pressed="${liked}"><span>♥</span> Suka <b class="like-count">${likesSnap.size}</b></button></article>`;
    }));
    grid.innerHTML = cards.join("");
  } catch (error) {
    console.error("Gagal memuat ulasan:", error);
    grid.innerHTML = `<div class="reviews-empty"><h3>Ulasan belum dapat dimuat</h3><p>${esc(error.code || "Periksa koneksi dan Firestore Rules")}</p></div>`;
  }
}

document.addEventListener("click", async event => {
  const button = event.target.closest(".review-like");
  if (!button || button.disabled) return;
  const reviewId = button.dataset.reviewId;
  if (!reviewId) return;
  let likeUser = currentLikeUser;
  if (!likeUser) {
    button.disabled = true;
    try {
      const credential = await signInAnonymously(auth);
      likeUser = credential.user;
      currentLikeUser = likeUser;
    } catch (error) {
      console.error("Anonymous like sign-in gagal:", error);
      showOrderStatus(`Like belum tersedia: ${error.code || error.message}. Coba muat ulang halaman.`);
      button.disabled = false;
      return;
    }
  }
  const likeRef = doc(db, "reviewLikes", `${reviewId}_${likeUser.uid}`);
  const liked = button.getAttribute("aria-pressed") === "true";
  button.disabled = true; button.innerHTML = '<span class="inline-spinner"></span> Menyimpan...';
  try {
    if (liked) await deleteDoc(likeRef);
    else await setDoc(likeRef, { reviewId, uid: likeUser.uid, createdAt: serverTimestamp() });
    await renderReviews();
  } catch (error) {
    console.error("Gagal memperbarui like:", error);
    showOrderStatus(`Like gagal disimpan: ${error.code || error.message}`);
    button.disabled = false;
  }
});
