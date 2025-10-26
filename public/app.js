// =================================================================
// == BAGIAN 1: KONFIGURASI FIREBASE
// =================================================================
// ⬇️⬇️⬇️ GANTI BAGIAN INI DENGAN firebaseConfig ANDA ⬇️⬇️⬇️
const firebaseConfig = {
  apiKey: "AIzaSyCeO7wuJuMcvLjv6geumpzmhUgEF09ytQs",
  authDomain: "proyek-penginapan.firebaseapp.com",
  projectId: "proyek-penginapan",
  storageBucket: "proyek-penginapan.firebasestorage.app",
  messagingSenderId: "1005287113235",
  appId: "1:1005287113235:web:aae10f8a8a610c1f69f5e6",
  measurementId: "G-7ENSJC42Q9"
};
// ⬆️⬆️⬆️ GANTI BAGIAN DI ATAS ⬆️⬆️⬆️

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();


// =================================================================
// == BAGIAN 2: LOGIKA NAVIGASI HALAMAN (PENJAGA PINTU)
// =================================================================
// Cek status login pengguna saat halaman dimuat
auth.onAuthStateChanged((user) => {
    const HalamanSaatIni = window.location.pathname;

    if (user && user.emailVerified) {
        // --- PENGGUNA SUDAH LOGIN & VERIFIKASI ---
        console.log("Pengguna sudah login:", user.email);
        // Jika mereka ada di halaman login atau index, tendang ke dashboard
        if (HalamanSaatIni.includes("login.html") || HalamanSaatIni === "/" || HalamanSaatIni.includes("index.html")) {
            window.location.replace("dashboard.html");
        }
    } else {
        // --- PENGGUNA BELUM LOGIN ATAU BELUM VERIFIKASI ---
        console.log("Pengguna belum login atau verifikasi.");
        // Jika mereka mencoba mengakses dashboard, tendang ke login
        if (HalamanSaatIni.includes("dashboard.html")) {
            window.location.replace("login.html");
        }
    }
});

// =================================================================
// == BAGIAN 3: LOGIKA KHUSUS HALAMAN
// =================================================================

// --- LOGIKA UNTUK HALAMAN LOGIN (login.html) ---
if (window.location.pathname.includes("login.html")) {
    // Ambil semua elemen dari HTML
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const showRegister = document.getElementById("show-register");
    const showLogin = document.getElementById("show-login");
    const loginButton = document.getElementById("login-button");
    const registerButton = document.getElementById("register-button");

    // Tampilkan formulir register
    showRegister.addEventListener("click", (e) => {
        e.preventDefault();
        loginForm.style.display = "none";
        registerForm.style.display = "block";
    });

    // Tampilkan formulir login
    showLogin.addEventListener("click", (e) => {
        e.preventDefault();
        loginForm.style.display = "block";
        registerForm.style.display = "none";
    });

    // === AKSI LOGIN ===
    loginButton.addEventListener("click", (e) => {
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        const loginError = document.getElementById("login-error");

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Berhasil login
                if (userCredential.user.emailVerified) {
                    // SUKSES & SUDAH VERIFIKASI -> Pindah ke dashboard
                    window.location.replace("dashboard.html");
                } else {
                    // SUKSES TAPI BELUM VERIFIKASI
                    loginError.textContent = "Email belum diverifikasi. Silakan cek inbox Anda.";
                    auth.signOut(); // Logout lagi
                }
            })
            .catch((error) => {
                // Gagal login
                loginError.textContent = "Email atau password salah.";
                console.error("Login Error:", error.message);
            });
    });

    // === AKSI REGISTER ===
    registerButton.addEventListener("click", (e) => {
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;
        const registerMessage = document.getElementById("register-message");

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // Berhasil register, kirim email verifikasi
                userCredential.user.sendEmailVerification()
                    .then(() => {
                        registerMessage.textContent = "Registrasi berhasil! Silakan cek email Anda untuk verifikasi.";
                        registerMessage.className = "info-message";
                        // Logout agar mereka tidak bisa login sebelum verifikasi
                        auth.signOut();
                    });
            })
            .catch((error) => {
                // Gagal register
                registerMessage.textContent = error.message;
                registerMessage.className = "error-message";
                console.error("Register Error:", error.message);
            });
    });
}

// --- LOGIKA UNTUK HALAMAN DASHBOARD (dashboard.html) ---
if (window.location.pathname.includes("dashboard.html")) {
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            auth.signOut()
                .then(() => {
                    // Logout berhasil, pindah ke halaman login
                    window.location.replace("login.html");
                })
                .catch((error) => {
                    console.error("Logout Error:", error.message);
                });
        });
    }
}

// =================================================================
// == BAGIAN 4: LOGIKA DASHBOARD (TAMBAHAN)
// =================================================================

if (window.location.pathname.includes("dashboard.html")) {
    
    // --- Referensi Elemen ---
    const navDashboard = document.getElementById('nav-dashboard');
    const navKartu = document.getElementById('nav-kartu');
    const contentDashboard = document.getElementById('content-dashboard');
    const contentKartu = document.getElementById('content-kartu');
    const kartuTableBody = document.getElementById('kartu-table-body');
    const tambahKartuBtn = document.getElementById('tambah-kartu-baru-btn');
    
    // Referensi Modal
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalTitle = document.getElementById('modal-title');
    const modalForm = document.getElementById('modal-form');
    const modalUidLama = document.getElementById('modal-uid-lama');
    const modalUid = document.getElementById('modal-uid');
    const modalNama = document.getElementById('modal-nama');
    const modalSimpanBtn = document.getElementById('modal-simpan-btn');
    const modalBatalBtn = document.getElementById('modal-batal-btn');
    
    let isEditMode = false;

    // --- Logika Navigasi Tab ---
    navDashboard.addEventListener('click', () => {
        contentDashboard.style.display = 'block';
        contentKartu.style.display = 'none';
        navDashboard.classList.add('active');
        navKartu.classList.remove('active');
    });

    navKartu.addEventListener('click', () => {
        contentDashboard.style.display = 'none';
        contentKartu.style.display = 'block';
        navDashboard.classList.remove('active');
        navKartu.classList.add('active');
        // Saat tab kartu diklik, muat datanya
        muatDataKartu();
    });

    // --- Fungsi CRUD Kartu ---

    // 1. Muat (Read) semua data kartu dari API
    async function muatDataKartu() {
        try {
            const response = await fetch('/api/kartu'); // API GET
            const kartuList = await response.json();
            
            kartuTableBody.innerHTML = ''; // Kosongkan tabel dulu
            
            if (kartuList.length === 0) {
                kartuTableBody.innerHTML = '<tr><td colspan="3">Belum ada kartu terdaftar.</td></tr>';
                return;
            }

            kartuList.forEach(kartu => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${kartu.id}</td>
                    <td>${kartu.namaTamu}</td>
                    <td>
                        <button class="button-edit" data-uid="${kartu.id}" data-nama="${kartu.namaTamu}">Edit</button>
                        <button class="button-delete" data-uid="${kartu.id}">Kosongkan</button>
                        <button class="button-delete-permanent" data-uid="${kartu.id}">Hapus Permanen</button>
                    </td>
                `;
                kartuTableBody.appendChild(tr);
            });

        } catch (error) {
            console.error('Gagal memuat data kartu:', error);
            kartuTableBody.innerHTML = '<tr><td colspan="3">Gagal memuat data.</td></tr>';
        }
    }

    // 2. Buka Modal (untuk Tambah atau Edit)
    function bukaModal(mode, data = {}) {
        isEditMode = (mode === 'edit');
        if (isEditMode) {
            modalTitle.textContent = 'Edit Nama Tamu';
            modalUidLama.value = data.uid;
            modalUid.value = data.uid;
            modalUid.disabled = true; // UID tidak bisa diedit
            modalNama.value = data.namaTamu;
        } else {
            modalTitle.textContent = 'Tambah Kartu Baru';
            modalUid.value = '';
            modalUid.disabled = false;
            modalNama.value = '[ Kosong ]';
        }
        modalBackdrop.style.display = 'flex';
    }

    // 3. Tutup Modal
    function tutupModal() {
        modalBackdrop.style.display = 'none';
        modalForm.reset(); // Kosongkan form
    }

    // 4. Aksi Simpan (Create/Update)
    async function simpanDataModal(e) {
        e.preventDefault();
        
        const uid = modalUid.value;
        const namaTamu = modalNama.value || '[ Kosong ]'; // Default jika kosong

        const apiUrl = isEditMode ? '/api/kartu' : '/api/kartu';
        const apiMethod = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(apiUrl, {
                method: apiMethod,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: uid, namaTamu: namaTamu })
            });

            if (!response.ok) {
                throw new Error(await response.json().message);
            }

            tutupModal();
            muatDataKartu(); // Muat ulang tabel
            
        } catch (error) {
            console.error('Gagal menyimpan:', error);
            alert(`Gagal menyimpan: ${error.message}`);
        }
    }

    // 5. Aksi Hapus (Delete)
    async function hapusNamaTamu(uid) {
        if (!confirm(`Anda yakin ingin mengosongkan nama tamu dari kartu ${uid}?`)) {
            return;
        }

        try {
            const response = await fetch('/api/kartu', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: uid })
            });

            if (!response.ok) {
                throw new Error(await response.json().message);
            }

            muatDataKartu(); // Muat ulang tabel

        } catch (error) {
            console.error('Gagal menghapus:', error);
            alert(`Gagal menghapus: ${error.message}`);
        }
    }

    // === TAMBAHKAN FUNGSI BARU DI SINI ===
    // 6. Aksi Hapus Permanen
    async function hapusKartuPermanen(uid) {
        if (!confirm(`PERINGATAN: Anda yakin ingin menghapus kartu ${uid} secara permanen? Aksi ini tidak bisa dibatalkan.`)) {
            return;
        }

        try {
            // Panggil API dengan query parameter
            const response = await fetch('/api/kartu?hapusPermanen=true', { 
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid: uid })
            });

            if (!response.ok) {
                throw new Error(await response.json().message);
            }

            muatDataKartu(); // Muat ulang tabel

        } catch (error) {
            console.error('Gagal menghapus permanen:', error);
            alert(`Gagal menghapus permanen: ${error.message}`);
        }
    }

    // --- Event Listeners (Penghubung Aksi) ---

    // Tombol "Tambah Kartu Baru"
    tambahKartuBtn.addEventListener('click', () => bukaModal('tambah'));

    // Tombol Batal di Modal
    modalBatalBtn.addEventListener('click', tutupModal);

    // Tombol Simpan di Modal
    modalForm.addEventListener('submit', simpanDataModal);

    // Tombol Edit & Hapus di Tabel (menggunakan event delegation)
    kartuTableBody.addEventListener('click', (e) => {
        if (e.target.classList.contains('button-edit')) {
            const uid = e.target.dataset.uid;
            const namaTamu = e.target.dataset.nama;
            bukaModal('edit', { uid: uid, namaTamu: namaTamu });
        }
        
        if (e.target.classList.contains('button-delete')) {
            const uid = e.target.dataset.uid;
            hapusNamaTamu(uid);
        }

        // Tombol Hapus Permanen
        if (e.target.classList.contains('button-delete-permanent')) {
            const uid = e.target.dataset.uid;
            hapusKartuPermanen(uid); // Panggil fungsi baru
        }
    });
}

// =================================================================
// == BAGIAN 5: LOGIKA HALAMAN PUBLIK (INDEX.HTML)
// =================================================================
if (window.location.pathname === "/" || window.location.pathname.includes("index.html")) {

    // --- Referensi Elemen Status & Alert ---
    const statusVilla1 = document.getElementById('status-villa1');
    const statusVilla2 = document.getElementById('status-villa2');
    const statusKamar1 = document.getElementById('status-kamar1');
    const alertBanner = document.getElementById('alert-banner');
    const alertMessage = document.getElementById('alert-message');

    // --- KONFIGURASI MQTT (UNTUK STATUS & ALERT) ---
    // AMBIL KREDENSIAL DARI FIREBASE CONFIG (atau ENV VARS jika mau lebih aman)
    // SEMENTARA PAKAI LANGSUNG (seperti di dashboard.html)
    const MQTT_HOST_PUBLIC = 'wss://4d8b5862577245479751349efcbff1a3.s1.eu.hivemq.cloud:8884/mqtt'; // Ganti! Contoh: wss://xxx.s1.eu.hivemq.cloud:8884/mqtt
    const MQTT_USER_PUBLIC = 'esp32_user'; // Ganti! Contoh: esp32_user
    const MQTT_PASS_PUBLIC = 'i2E45678'; // Ganti!
    const VILLA1_TOPIC = 'villa_1/status';
    const VILLA2_TOPIC = 'villa_2/status';
    const KAMAR1_TOPIC = 'kamar_1/status';
    const ALERT_TOPIC_PUBLIC = 'system/alerts'; // Topik alert

    const publicClientId = 'web_public_' + Math.random().toString(16).substr(2, 8);
    const publicOptions = {
      clientId: publicClientId, username: MQTT_USER_PUBLIC, password: MQTT_PASS_PUBLIC,
      // ... (opsi lain sama seperti di dashboard) ...
    };

    console.log('Menghubungkan ke MQTT Broker (Publik)...');
    const publicClient = mqtt.connect(MQTT_HOST_PUBLIC, publicOptions);

    publicClient.on('connect', () => {
        console.log('Terhubung ke MQTT (Publik)!');
        // Subscribe ke semua topik status DAN topik alert
        publicClient.subscribe([VILLA1_TOPIC, VILLA2_TOPIC, KAMAR1_TOPIC, ALERT_TOPIC_PUBLIC], { qos: 0 }, (err) => {
            if (err) console.error('Gagal subscribe (Publik): ', err);
            else console.log('Berhasil subscribe ke topik status & alert');
        });
    });

    publicClient.on('message', (topic, payload) => {
        const message = payload.toString();
        console.log(`Pesan diterima [Publik] ${topic}: ${message}`);
        try {
            const data = JSON.parse(message);

            // --- TANGANI PESAN STATUS ---
            if (topic === VILLA1_TOPIC) updateStatusElement(statusVilla1, data);
            else if (topic === VILLA2_TOPIC) updateStatusElement(statusVilla2, data);
            else if (topic === KAMAR1_TOPIC) updateStatusElement(statusKamar1, data);
            // --- TANGANI PESAN ALERT (BARU) ---
            else if (topic === ALERT_TOPIC_PUBLIC) {
                if (data.type === 'unregistered_card') {
                    displayAlert(`Kartu tidak terdaftar terdeteksi! UID: ${data.uid} di ${data.location}`);
                }
                // Bisa tambahkan tipe alert lain di sini nanti
            }
        } catch(e) { console.error('Gagal parse JSON (Publik):', e); }
    });

    publicClient.on('error', (err) => console.error('Koneksi MQTT Error (Publik): ', err));

    // --- Fungsi Helper untuk Update Status ---
    function updateStatusElement(element, data) {
        if (!element) return;
        if (data.status === 'TERISI') {
            // Kita butuh mengambil nama dari API jika TERISI
            fetch(`/api/kartu?uid=${data.uid}`) // Asumsi API kartu bisa handle GET by UID
                .then(res => res.ok ? res.json() : null)
                .then(kartu => {
                    const namaTamu = kartu && kartu.length > 0 ? kartu[0].namaTamu : 'UID: ' + data.uid; // Tampilkan UID jika nama tidak ada
                    element.textContent = `TERISI 🔴 (${namaTamu})`;
                    element.style.color = '#dc3545';
                })
                .catch(() => { // Gagal fetch nama, tampilkan UID saja
                     element.textContent = `TERISI 🔴 (UID: ${data.uid})`;
                     element.style.color = '#dc3545';
                });
        } else { // KOSONG
            element.textContent = 'KOSONG 🟢';
            element.style.color = '#28a745';
        }
    }

     // --- Fungsi Helper untuk Menampilkan Alert ---
    let alertTimeout;
    function displayAlert(message) {
        if (!alertBanner || !alertMessage) return;
        alertMessage.textContent = message;
        alertBanner.style.display = 'block';
        
        // Sembunyikan otomatis setelah 7 detik
        clearTimeout(alertTimeout); // Hapus timeout sebelumnya jika ada
        alertTimeout = setTimeout(() => {
            alertBanner.style.display = 'none';
        }, 7000); 
    }
} // Akhir blok if index.html