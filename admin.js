
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
  query
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

const defaultServices = [
  ["security-assessment", "🛡️", "Cek Keamanan Website", "Audit keamanan website secara berizin."],
  ["wifi-audit", "📡", "Cek Keamanan WiFi", "Assessment keamanan jaringan WiFi milik klien."],
  ["cctv-audit", "📹", "Cek Keamanan CCTV", "Audit konfigurasi CCTV milik klien."],
  ["mobile-security", "📱", "Mobile Security Testing", "Pengujian keamanan aplikasi secara berizin."],
  ["wa-security", "💬", "WhatsApp Security", "Bantuan keamanan akun dan privasi."],
  ["link-security", "🔗", "Link Security Assessment", "Pemeriksaan keamanan URL dan domain."],
  ["social-boost", "📈", "Boosting All Medsos", "Layanan digital marketing."],
  ["private-training", "🎓", "Private Ethical Hacking", "Pelatihan keamanan siber secara legal."],
  ["osint-audit", "🔎", "OSINT & Exposure Check", "Pemeriksaan exposure informasi yang sah."],
  ["custom-development", "🧩", "Custom Security Tool / Script", "Pembuatan tools defensif dan automation."]
];

const defaultPackages = (() => {
  const prices = [80000, 160000, 320000, 400000, 480000, 560000, 640000, 720000, 800000, 880000];
  const quantities = ["1K", "2K", "3K", "4K", "5K", "6K", "7K", "8K", "9K", "10K"];
  const result = [];

  for (const platform of ["instagram", "tiktok"]) {
    quantities.forEach((qty, i) => {
      result.push({
        platform,
        qty,
        price: prices[i],
        guarantee: i === 9 ? "30 hari" : "7 hari"
      });
    });
  }

  return result;
})();

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
  button.disabled = value;
}

function getFormValue(form, name) {
  return form.elements.namedItem(name);
}

// LOGIN DAN PEMERIKSAAN ADMIN

onAuthStateChanged(auth, async user => {
  if (!user) {
    $("loginView")?.classList.remove("hidden");
    $("dashboard")?.classList.add("hidden");
    return;
  }

  showStatus("loginStatus", "Memeriksa akses admin...");

  try {
    const adminRef = doc(db, "admins", user.uid);
    const adminSnap = await getDoc(adminRef);

    if (!adminSnap.exists() || adminSnap.data().enabled !== true) {
      showStatus("loginStatus", "Akun ini belum diberi akses admin.");
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

  showStatus("loginStatus", "Memproses login...");
  setBusy(button, true);

  try {
    await signInWithEmailAndPassword(
      auth,
      $("loginEmail").value.trim(),
      $("loginPassword").value
    );
  } catch (error) {
    showStatus("loginStatus", showError("Login gagal", error));
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
  const servicesSnap = await getDocs(collection(db, "services"));

  if (servicesSnap.empty) {
    for (const [id, icon, name, description] of defaultServices) {
      await setDoc(doc(db, "services", id), {
        icon,
        name,
        description,
        active: true
      });
    }
  }

  const packagesSnap = await getDocs(collection(db, "packages"));

  if (packagesSnap.empty) {
    for (const item of defaultPackages) {
      await addDoc(collection(db, "packages"), item);
    }
  }

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
      loadOrders()
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
}

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

  const untilField = getFormValue(form, "maintenanceUntil");
  data.maintenanceUntil = untilField?.value || "";

  showStatus("siteStatus", "Menyimpan pengaturan...");
  setBusy(button, true);

  try {
    await setDoc(doc(db, "siteConfig", "main"), data, { merge: true });

    showStatus("siteStatus", "Pengaturan berhasil disimpan ✓");
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
    qty: String(fields.get("qty") || "").trim().toUpperCase(),
    price: Number(fields.get("price")),
    guarantee: String(fields.get("guarantee") || "").trim()
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
        <b>${esc(item.platform)} ${esc(item.qty)}</b>
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

  container.innerHTML = orders.map(item => `
    <div class="order-row">
      <div>
        <b>${esc(item.name || "Tanpa nama")} • ${esc(item.service || "")}</b>
        <small>${esc(item.phone || "")} ${item.email ? "• " + esc(item.email) : ""}</small>
        <p>${esc(item.details || "")}</p>
      </div>
      <select class="status-select" data-id="${esc(item.id)}">
        ${["new", "contacted", "paid", "processing", "done", "cancelled"]
          .map(status => `
            <option value="${status}" ${item.status === status ? "selected" : ""}>
              ${status}
            </option>
          `).join("")}
      </select>
    </div>
  `).join("");
}

// EDIT DAN HAPUS LAYANAN / PAKET

document.addEventListener("click", async event => {
  const button = event.target.closest("button");
  if (!button) return;

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

    for (const key of ["id", "platform", "qty", "price", "guarantee"]) {
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
