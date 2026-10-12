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

  renderPackages("instagram");
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
