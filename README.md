# Kenseonn Digital IT Service — GitHub Pages + Firebase

Website static yang cocok untuk GitHub Pages, dengan Firebase Authentication + Cloud Firestore untuk admin panel, layanan, paket, dan order.

## 1. Buat Firebase
1. Buka Firebase Console.
2. Create project.
3. Add Web App.
4. Copy `firebaseConfig` ke `firebase-config.js`.
5. Authentication → Sign-in method → aktifkan **Email/Password**.
6. Firestore Database → Create database.
7. Firestore → Rules → paste isi `firestore.rules` → Publish.

## 2. Buat akun admin
1. Authentication → Users → Add user.
2. Buat email/password admin.
3. Copy UID user tersebut.
4. Firestore → buat collection `admins`.
5. Buat document dengan Document ID = UID tadi.
6. Isi field:
   - `enabled` : boolean `true`
   - `name` : string, misalnya `Kenseonn`
7. Buka `admin.html`, login dengan akun tersebut.

Catatan: document `admins` sengaja tidak dapat dibuat/diubah dari website. Ini mencegah pengunjung menjadikan dirinya admin.

## 3. Upload ke GitHub Pages
Upload semua file:
- index.html
- admin.html
- app.js
- admin.js
- firebase-config.js
- styles.css
- firestore.rules

Di GitHub: Settings → Pages → Deploy from branch → pilih `main` + `/root`.

## 4. Isi awal
Website sudah punya fallback layanan dan paket sehingga tampilan tidak kosong sebelum data Firestore diisi. Setelah admin menambah/mengubah data, public website mengambil data terbaru dari Firestore.

## 5. Keamanan
Jangan pernah upload:
- Firebase service-account JSON
- private key
- password admin
- API secret backend

Firebase Web API key bukan pengganti Security Rules. Perlindungan data Firestore tetap berasal dari rules.

## Catatan layanan
Template ini sengaja memakai bahasa layanan keamanan yang authorized/berizin. Permintaan yang dapat digunakan untuk mengambil alih akun/perangkat, phishing terhadap target nyata, pelacakan invasif, atau akses kamera tanpa izin tidak dijadikan fitur operasional.


## Maintenance Mode V2
Admin Panel → Website → Maintenance Mode.

- Centang `Aktifkan Maintenance Mode`.
- Isi judul dan pesan jika ingin custom.
- Pilih `Countdown sampai` jika ingin countdown.
- Simpan Website.
- Pengunjung akan melihat maintenance screen.
- `admin.html` tetap dapat dibuka untuk mematikan maintenance.

Maintenance state disimpan di `siteConfig/main` Firestore. Karena rules hanya mengizinkan admin menulis konfigurasi, pengunjung tidak dapat mengubah status maintenance.


## V2.1 Audit
V2.1 menambahkan error handling pada login admin, pemuatan dashboard, penyimpanan website/maintenance, CRUD layanan/paket, penghapusan data, dan perubahan status order. Jika Firebase/Rules belum benar, dashboard akan menampilkan pesan yang jelas alih-alih gagal diam-diam.


## Firebase connection
This V2.1 package is preconfigured for the Firebase Web App:
- Project ID: `kenseonn-it-service`
- Authentication: Email/Password
- Cloud Firestore database: `(default)`
- Hosting site: `kenseonn-it-service`

The Firebase Web configuration is stored in `firebase-config.js`. The web API key is intended for client-side Firebase SDK use; Firestore Security Rules protect the database. Never add a Firebase service-account JSON or private key to this ZIP.
