// =================================================================
// == FILE: public/app.js (VERSI FINAL TERSTRUKTUR & LENGKAP)
// =================================================================

// =================================================================
// == BAGIAN 1: KONFIGURASI UMUM (Firebase, Constants)
// =================================================================
// ⬇️⬇️⬇️ PASTIKAN KUNCI ANDA SUDAH BENAR ⬇️⬇️⬇️
const firebaseConfig = {
    apiKey: "AIzaSyCeO7wuJuMcvLjv6geumpzmhUgEF09ytQs",
    authDomain: "proyek-penginapan.firebaseapp.com",
    projectId: "proyek-penginapan",
    storageBucket: "proyek-penginapan.firebasestorage.app",
    messagingSenderId: "1005287113235",
    appId: "1:1005287113235:web:aae10f8a8a610c1f69f5e6",
    measurementId: "G-7ENSJC42Q9"
};
// ⬆️⬆️⬆️ PASTIKAN KUNCI ANDA SUDAH BENAR ⬆️⬆️⬆️

// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// --- KONSTANTA DEVICE & MQTT (Umum) ---
const KAMAR1_ID = 'kamar_1';
const RELAY_TOPIC = 'kamar_1/kontrol';
const VILLA1_TOPIC = 'villa_1/status';
const VILLA2_TOPIC = 'villa_2/status';
const KAMAR1_STATUS_TOPIC = 'kamar_1/status';
const ALERT_TOPIC_PUBLIC = 'system/alerts';
const MQTT_HOST_PUBLIC = 'wss://4d8b5862577245479751349efcbff1a3.s1.eu.hivemq.cloud:8884/mqtt';
const MQTT_USER_PUBLIC = 'new_esp_user';
const MQTT_PASS_PUBLIC = 'i2E45678910';


// =================================================================
// == BAGIAN 2: AUTENTIKASI & LOGIKA LOGIN/REGISTER
// =================================================================
auth.onAuthStateChanged((user) => {
    const HalamanSaatIni = window.location.pathname;

    if (user && user.emailVerified) {
        if (HalamanSaatIni.includes("login.html") || HalamanSaatIni === "/" || HalamanSaatIni.includes("index.html")) {
            window.location.replace("dashboard.html");
        }
    } else {
        if (HalamanSaatIni.includes("dashboard.html")) {
            window.location.replace("login.html");
        }
    }
});

// --- LOGIKA KHUSUS HALAMAN LOGIN (Bagian 3) ---
if (window.location.pathname.includes("login.html")) {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const showRegister = document.getElementById("show-register");
    const showLogin = document.getElementById("show-login");
    const loginButton = document.getElementById("login-button");
    const registerButton = document.getElementById("register-button");

    showRegister.addEventListener("click", (e) => { e.preventDefault(); loginForm.style.display = "none"; registerForm.style.display = "block"; });
    showLogin.addEventListener("click", (e) => { e.preventDefault(); loginForm.style.display = "block"; registerForm.style.display = "none"; });

    loginButton.addEventListener("click", (e) => {
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;
        const loginError = document.getElementById("login-error");

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                if (userCredential.user.emailVerified) { window.location.replace("dashboard.html"); } 
                else { loginError.textContent = "Email belum diverifikasi. Silakan cek inbox Anda."; auth.signOut(); }
            })
            .catch((error) => { loginError.textContent = "Email atau password salah."; console.error("Login Error:", error.message); });
    });

    registerButton.addEventListener("click", (e) => {
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;
        const registerMessage = document.getElementById("register-message");

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                userCredential.user.sendEmailVerification()
                    .then(() => {
                        registerMessage.textContent = "Registrasi berhasil! Silakan cek email Anda untuk verifikasi.";
                        registerMessage.className = "info-message";
                        auth.signOut();
                    });
            })
            .catch((error) => { registerMessage.textContent = error.message; registerMessage.className = "error-message"; console.error("Register Error:", error.message); });
    });
}


// =================================================================
// == BAGIAN 3: FUNGSI HELPER UMUM (Grafik, MQ-135, Navigasi)
// =================================================================

let activeCharts = {}; // Referensi grafik aktif

function getAirQualityStatus(ppm) {
    if (ppm < 800) return { level: 'Clean', color: 'green', emoji: '🟢', desc: 'Kualitas udara sangat baik dan bersih.' };
    if (ppm >= 800 && ppm < 1200) return { level: 'Moderate', color: 'orange', emoji: '🟡', desc: 'Kualitas udara masih baik. Level normal.' };
    if (ppm >= 1200 && ppm < 2000) return { level: 'Unhealthy', color: 'darkorange', emoji: '🟠', desc: 'Udara mulai pengap. Indikasi ventilasi buruk.' };
    if (ppm >= 2000 && ppm < 4000) return { level: 'Poluted', color: 'red', emoji: '🔴', desc: 'Kualitas udara buruk. Dapat menyebabkan kantuk/sakit kepala.' };
    if (ppm >= 4000) return { level: 'Danger', color: 'darkred', emoji: '🟤', desc: 'Kualitas udara sangat berbahaya. Harus segera ventilasi.' };
    return { level: 'N/A', color: 'gray', emoji: '⚫', desc: 'Data belum tersedia.' };
}

function showSection(sectionId) {
    const allSections = document.querySelectorAll('main section'); 
    const navDashboard = document.getElementById('nav-dashboard');
    const navKartu = document.getElementById('nav-kartu');
    
    allSections.forEach(section => { section.style.display = (section.id === sectionId) ? 'block' : 'none'; });
    if (navDashboard && navKartu) {
        if (sectionId === 'content-dashboard' || sectionId === 'content-kartu') {
             navDashboard.classList.toggle('active', sectionId === 'content-dashboard');
             navKartu.classList.toggle('active', sectionId === 'content-kartu');
        } else { navDashboard.classList.remove('active'); navKartu.classList.remove('active'); }
    }
}

// --- FUNGSI GRAFIK (MENGAMBIL DATA RIIL) ---
async function drawChart(canvasId, title, unit, deviceId, field, range = '1h', agg = '10s') {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (activeCharts[canvasId]) { activeCharts[canvasId].destroy(); }
    const card = ctx.closest('.metric-card');
    let statsContainer = card.querySelector('.stats-cards');
    statsContainer.innerHTML = '<p style="color:#007bff;">Memuat data...</p>';

    try {
        const apiUrl = `/api/getData?id=${deviceId}&field=${field}&range=${range}&agg=${agg}`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        const chartData = result.data;
        const statsData = result.stats;

        // 1. Tampilkan Statistik (Rata-rata Hari Ini vs Kemarin)
        const hariIni = statsData.hari_ini !== null ? statsData.hari_ini.toFixed(2) : '--';
        const kemarin = statsData.kemarin !== null ? statsData.kemarin.toFixed(2) : '--';
        
        statsContainer.innerHTML = `<div class="stat-item"><strong>Hari Ini:</strong> <span style="font-weight:bold;">${hariIni} ${unit}</span></div>
            <div class="stat-item"><strong>Kemarin:</strong> <span style="font-weight:bold;">${kemarin} ${unit}</span></div>`;
        
        if (chartData.length === 0) { statsContainer.innerHTML += '<p style="color:#dc3545;margin-top:10px;">(Data Historis Belum Ada)</p>'; }

        // 2. Gambar Grafik
        const newChart = new Chart(ctx, {
            type: 'line', data: { datasets: [{ label: title, data: chartData, borderColor: '#007bff', backgroundColor: 'rgba(0, 123, 255, 0.1)', tension: 0.1, pointRadius: 0 }] },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    x: { type: 'time', adapters: { date: luxon }, time: { unit: 'minute', tooltipFormat: 'HH:mm:ss', displayFormats: { minute: 'HH:mm' } }, title: { display: true, text: 'Waktu' } },
                    y: { beginAtZero: false, title: { display: true, text: unit } }
                }, plugins: { title: { display: true, text: title }, legend: { display: false } }
            }
        }); activeCharts[canvasId] = newChart;
    } catch (error) {
        console.error(`Gagal memuat data grafik (${field}):`, error);
        statsContainer.innerHTML = '<span style="color:red;">Gagal memuat data dari InfluxDB. Cek koneksi API.</span>';
    }
}


// =================================================================
// == BAGIAN 5: LOGIKA UTAMA DASHBOARD (ADMIN)
// =================================================================

if (window.location.pathname.includes("dashboard.html")) {
    
    // --- REFERENSI KHUSUS & STATE ---
    const allSections = document.querySelectorAll('main section');
    const propertyCards = document.querySelectorAll('.property-card');
    const backButtons = document.querySelectorAll('.back-button');
    const navDashboard = document.getElementById('nav-dashboard');
    const navKartu = document.getElementById('nav-kartu');
    const contentDashboard = document.getElementById('content-dashboard');
    const contentKartu = document.getElementById('content-kartu');
    const kartuTableBody = document.getElementById('kartu-table-body');
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalForm = document.getElementById('modal-form');
    const modalUid = document.getElementById('modal-uid');
    const modalNama = document.getElementById('modal-nama');
    const modalTitle = document.getElementById('modal-title');
    const modalUidLama = document.getElementById('modal-uid-lama');
    const modalSimpanBtn = document.getElementById('modal-simpan-btn');
    const modalBatalBtn = document.getElementById('modal-batal-btn');
    const tambahKartuBtn = document.getElementById('tambah-kartu-baru-btn');


    let isEditMode = false;
    let relayNames = { 'RELAY1': 'Lampu Kamar Tidur', 'RELAY2': 'Lampu Kamar Mandi', 'RELAY3': 'Kipas', 'RELAY4': 'Lampu Teras' };
    let relayStates = { 'RELAY1': 'OFF', 'RELAY2': 'OFF', 'RELAY3': 'OFF', 'RELAY4': 'OFF' };

    // --- FUNGSI KONTROL RELAY & PENGATURAN ---

    function renderRelayControls() {
        const kontrolDiv = document.getElementById('kamar1-kontrol-relay');
        if (!kontrolDiv) return;
        let html = '<h3>Kontrol Perangkat</h3><div class="relay-grid">';
        for (let i = 1; i <= 4; i++) {
            const relayId = `RELAY${i}`;
            const name = relayNames[relayId];
            const state = relayStates[relayId];
            const colorClass = state === 'ON' ? 'bg-success' : 'bg-danger';
            html += `<div class="relay-item"><h4>${name}</h4>
                    <button data-relay="${relayId}" data-state="ON" class="btn btn-sm btn-on">ON</button>
                    <button data-relay="${relayId}" data-state="OFF" class="btn btn-sm btn-off">OFF</button>
                    <span class="status-indicator ${colorClass}">${state}</span></div>`;
        }
        kontrolDiv.innerHTML = html + '</div>';
        kontrolDiv.querySelectorAll('.btn-on, .btn-off').forEach(btn => { btn.addEventListener('click', handleRelayControl); });
    }

    async function handleRelayControl(e) {
        const relayId = e.target.dataset.relay;
        const newState = e.target.dataset.state;
        const command = `${relayId}_${newState}`;
        try {
            const response = await fetch('/api/kontrolRelay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: command }) });
            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Gagal mengirim perintah ke server.'); }
            relayStates[relayId] = newState;
            renderRelayControls();
        } catch (error) { alert(`Gagal Kontrol Relay: ${error.message}`); console.error('Kontrol Gagal:', error); }
    }

    function renderRelaySettings() {
        const settingDiv = document.getElementById('kamar1-pengaturan-relay');
        if (!settingDiv) return;
        let html = '<h3>Pengaturan Nama Perangkat</h3><form id="relay-name-form">';
        for (let i = 1; i <= 4; i++) {
            const relayId = `RELAY${i}`;
            const name = relayNames[relayId];
            html += `<div class="form-group"><label>Relay ${i}:</label><input type="text" id="name-${relayId}" value="${name}" required></div>`;
        }
        html += '<button type="submit" class="button-add">Simpan Nama Kustom</button></form>';
        settingDiv.innerHTML = html;
        document.getElementById('relay-name-form').addEventListener('submit', handleSaveRelayNames);
    }

    async function handleSaveRelayNames(e) {
        e.preventDefault();
        const saveButton = e.target.querySelector('button[type="submit"]');
        if (saveButton) saveButton.disabled = true;

        const newNames = {};
        for (let i = 1; i <= 4; i++) {
            const relayId = `RELAY${i}`;
            const input = document.getElementById(`name-${relayId}`).value;
            newNames[relayId] = input;
        }

        try {
            const response = await fetch('/api/saveSettings', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ relayNames: newNames })
            });

            if (!response.ok) { const errorData = await response.json(); throw new Error(errorData.message || 'Gagal menyimpan ke server.'); }
            
            relayNames = newNames; renderRelayControls(); renderRelaySettings();
            alert('Nama relay berhasil disimpan ke database!');
            
        } catch (error) {
            alert(`Gagal menyimpan: ${error.message}`); console.error('Save Settings Gagal:', error);
        } finally {
            if (saveButton) saveButton.disabled = false;
        }
    }


    // --- FUNGSI MANAJEMEN KARTU (CRUD & Modal) ---
    
    async function muatDataKartu() {
        try {
            const response = await fetch('/api/kartu');
            const kartuList = await response.json();
            
            kartuTableBody.innerHTML = '';
            if (kartuList.length === 0) { kartuTableBody.innerHTML = '<tr><td colspan="4">Belum ada kartu terdaftar.</td></tr>'; return; }

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
                `; kartuTableBody.appendChild(tr);
            });

        } catch (error) { console.error('Gagal memuat data kartu:', error); kartuTableBody.innerHTML = '<tr><td colspan="4">Gagal memuat data.</td></tr>'; }
    }
    
    // --- LOGIKA EVENT LISTENER UNTUK RESOLUSI (BARU) ---
    function setupChartListeners() {
        document.querySelectorAll('.metric-grid').forEach(grid => {
            grid.addEventListener('click', (e) => {
                const button = e.target.closest('.res-btn');
                if (!button) return;

                const card = button.closest('.metric-card');
                const deviceId = card.dataset.deviceId;
                const fieldId = card.dataset.fieldId;
                const unit = card.dataset.unitId;

                // Dapatkan parameter resolusi baru
                const newAgg = button.dataset.agg;
                const newRange = button.dataset.range;
                
                // Nonaktifkan tombol lain, aktifkan tombol ini
                card.querySelectorAll('.res-btn').forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Panggil fungsi gambar ulang dengan resolusi baru
                const canvasId = card.querySelector('canvas').id;
                const title = card.querySelector('h3').textContent;
                
                // Panggil API Riil
                drawChart(canvasId, title, unit, deviceId, fieldId, newRange, newAgg);
            });
        });
    }

    function bukaModal(mode, data = {}) {
        isEditMode = (mode === 'edit');
        if (isEditMode) {
            modalTitle.textContent = 'Edit Nama Tamu';
            modalUid.value = data.uid;
            modalUid.disabled = true;
            modalNama.value = data.namaTamu;
        } else {
            modalTitle.textContent = 'Tambah Kartu Baru';
            modalUid.value = '';
            modalUid.disabled = false;
            modalNama.value = '[ Kosong ]';
        } modalBackdrop.style.display = 'flex';
    }

    function tutupModal() {
        modalBackdrop.style.display = 'none';
        modalForm.reset();
    }

    async function simpanDataModal(e) {
        e.preventDefault();
        const uid = modalUid.value;
        const namaTamu = modalNama.value || '[ Kosong ]';
        const apiUrl = isEditMode ? '/api/kartu' : '/api/kartu';
        const apiMethod = isEditMode ? 'PUT' : 'POST';

        try {
            const response = await fetch(apiUrl, { method: apiMethod, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: uid, namaTamu: namaTamu }) });
            if (!response.ok) { throw new Error(await response.json().message); }

            tutupModal(); muatDataKartu();
        } catch (error) { console.error('Gagal menyimpan:', error); alert(`Gagal menyimpan: ${error.message}`); }
    }

    async function hapusNamaTamu(uid) {
        if (!confirm(`Anda yakin ingin mengosongkan nama tamu dari kartu ${uid}?`)) { return; }
        try {
            const response = await fetch('/api/kartu', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: uid }) });
            if (!response.ok) { throw new Error(await response.json().message); }
            muatDataKartu();
        } catch (error) { console.error('Gagal menghapus:', error); alert(`Gagal menghapus: ${error.message}`); }
    }

    async function hapusKartuPermanen(uid) {
        if (!confirm(`PERINGATAN: Anda yakin ingin menghapus kartu ${uid} secara permanen? Aksi ini tidak bisa dibatalkan.`)) { return; }
        try {
            const response = await fetch('/api/kartu?hapusPermanen=true', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ uid: uid }) });
            if (!response.ok) { throw new Error(await response.json().message); }
            muatDataKartu();
        } catch (error) { console.error('Gagal menghapus permanen:', error); alert(`Gagal menghapus permanen: ${error.message}`); }
    }

    // --- FUNGSI GRAFIK & INITIALIZE UTAMA ---
    
    function renderAllCharts(unitId) {
        if (unitId === 'kamar_1') {
            drawChart('chart-kamar1-suhu', 'Suhu Udara', '°C', KAMAR1_ID, 'suhu');
            drawChart('chart-kamar1-kelembapan', 'Kelembapan', '% RH', KAMAR1_ID, 'kelembapan');
            drawChart('chart-kamar1-ppm', 'Kualitas Udara', 'PPM', KAMAR1_ID, 'ppm_udara');
            drawChart('chart-kamar1-tegangan', 'Tegangan', 'V', KAMAR1_ID, 'tegangan');
            drawChart('chart-kamar1-arus', 'Arus', 'A', KAMAR1_ID, 'arus');
            drawChart('chart-kamar1-daya', 'Daya', 'W', KAMAR1_ID, 'daya');
            drawChart('chart-kamar1-energi', 'Energi', 'kWh', KAMAR1_ID, 'energi');
            drawChart('chart-kamar1-frekuensi', 'Frekuensi', 'Hz', KAMAR1_ID, 'frekuensi');
            drawChart('chart-kamar1-pf', 'Power Factor', 'PF', KAMAR1_ID, 'pf');
        } else if (unitId === 'villa_1' || unitId === 'villa_2') {
            const deviceId = unitId;
            drawChart(`chart-${unitId}-tegangan`, 'Tegangan', 'V', deviceId, 'tegangan');
            drawChart(`chart-${unitId}-arus`, 'Arus', 'A', deviceId, 'arus');
            drawChart(`chart-${unitId}-daya`, 'Daya', 'W', deviceId, 'daya');
            drawChart(`chart-${unitId}-energi`, 'Energi', 'kWh', deviceId, 'energi');
            drawChart(`chart-${unitId}-frekuensi`, 'Frekuensi', 'Hz', deviceId, 'frekuensi');
            drawChart(`chart-${unitId}-pf`, 'Power Factor', 'PF', deviceId, 'pf');
        }
    }
    
    // Pemuatan Nama Relay dari Firestore
    async function loadRelayNames() {
        try {
            const response = await fetch('/api/getSettings?id=kamar_1_settings');
            if (response.ok) {
                const data = await response.json();
                if (data.relayNames) { relayNames = data.relayNames; }
            }
        } catch (error) { console.error('Gagal memuat nama relay dari Firestore:', error); }
    }

    // FUNGSI UTAMA UNTUK MENGISI HALAMAN DETAIL
    async function initializeKamar1Detail() {
        await loadRelayNames();
        renderRelayControls();
        renderRelaySettings();
        renderAirQuality(1500); // Dummy PPM
        renderAllCharts(KAMAR1_ID);
        setTimeout(setupChartListeners, 100); 
    }

    // --- LOGIKA EVENT LISTENERS UTAMA ---
    
    navDashboard.addEventListener('click', () => { showSection('content-dashboard'); });
    navKartu.addEventListener('click', () => { showSection('content-kartu'); muatDataKartu(); });

    propertyCards.forEach(card => {
        card.addEventListener('click', () => {
            const targetSectionId = card.dataset.target;
            showSection(targetSectionId); 

        if (targetSectionId === 'detail-kamar1') { 
            // Inisialisasi Kamar 1 (sudah memanggil setupChartListeners di dalamnya)
            initializeKamar1Detail(); 
        } 
        else if (targetSectionId === 'detail-villa1') { 
            // Panggil renderAllCharts, lalu pasang listener setelah 100ms
            renderAllCharts('villa_1'); 
            setTimeout(setupChartListeners, 100); 
        } 
        else if (targetSectionId === 'detail-villa2') { 
            // Panggil renderAllCharts, lalu pasang listener setelah 100ms
            renderAllCharts('villa_2');
            setTimeout(setupChartListeners, 100);
        }
        });
    });

    backButtons.forEach(button => { button.addEventListener('click', () => { showSection('content-dashboard'); }); });

    // Event listener untuk tombol CRUD di Tabel
    kartuTableBody.addEventListener('click', (e) => {
        const uid = e.target.dataset.uid;
        if (e.target.classList.contains('button-edit')) { bukaModal('edit', { uid: uid, namaTamu: e.target.dataset.nama }); }
        if (e.target.classList.contains('button-delete')) { hapusNamaTamu(uid); }
        if (e.target.classList.contains('button-delete-permanent')) { hapusKartuPermanen(uid); }
    });

    // Event listener modal
    modalForm.addEventListener('submit', simpanDataModal);
    modalBatalBtn.addEventListener('click', tutupModal);
    tambahKartuBtn.addEventListener('click', () => bukaModal('tambah'));


    showSection('content-dashboard'); // Tampilkan section dashboard utama saat halaman dimuat

} 

// =================================================================
// == BAGIAN 6: LOGIKA HALAMAN PUBLIK (INDEX.HTML)
// =================================================================

if (window.location.pathname === "/" || window.location.pathname.includes("index.html")) {
    
    // Referensi Elemen Status & Alert
    const statusVilla1 = document.getElementById('status-villa1');
    const statusVilla2 = document.getElementById('status-villa2');
    const statusKamar1 = document.getElementById('status-kamar1');
    const alertBanner = document.getElementById('alert-banner');
    const alertMessage = document.getElementById('alert-message');

    // KONFIGURASI MQTT PUBLIK (Sudah di atas)
    const publicClientId = 'web_public_' + Math.random().toString(16).substr(2, 8);
    const publicOptions = { clientId: publicClientId, username: MQTT_USER_PUBLIC, password: MQTT_PASS_PUBLIC };

    console.log('Menghubungkan ke MQTT Broker (Publik)...');
    const publicClient = mqtt.connect(MQTT_HOST_PUBLIC, publicOptions);

    publicClient.on('connect', () => {
        console.log('Terhubung ke MQTT (Publik)!');
        publicClient.subscribe([VILLA1_TOPIC, VILLA2_TOPIC, KAMAR1_STATUS_TOPIC, ALERT_TOPIC_PUBLIC], { qos: 0 });
    });

    publicClient.on('message', (topic, payload) => {
        const message = payload.toString();
        try {
            const data = JSON.parse(message);
            if (topic === VILLA1_TOPIC) updateStatusElement(statusVilla1, data);
            else if (topic === VILLA2_TOPIC) updateStatusElement(statusVilla2, data);
            else if (topic === KAMAR1_STATUS_TOPIC) updateStatusElement(statusKamar1, data);
            else if (topic === ALERT_TOPIC_PUBLIC) {
                if (data.type === 'unregistered_card') { displayAlert(`Kartu tidak terdaftar terdeteksi! UID: ${data.uid} di ${data.location}`); }
            }
        } catch(e) { console.error('Gagal parse JSON (Publik):', e); }
    });

    publicClient.on('error', (err) => console.error('Koneksi MQTT Error (Publik): ', err));

    // Fungsi Helper untuk Update Status
    async function updateStatusElement(element, data) {
        if (!element) return; element.style.color = '#777'; element.textContent = 'Memuat...'; 
        if (data.status === 'TERISI') {
            try {
                const response = await fetch(`/api/kartu?uid=${data.uid}`); 
                if (response.ok) {
                    const kartuArray = await response.json();
                    if (kartuArray && kartuArray.length > 0) {
                        const namaTamu = kartuArray[0].namaTamu || `UID: ${data.uid}`;
                        element.textContent = `TERISI 🔴 (${namaTamu})`;
                        element.style.color = '#dc3545';
                    } else { element.textContent = `TERISI 🔴 (UID: ${data.uid})`; element.style.color = '#dc3545'; }
                } else if (response.status === 404) {
                    element.textContent = `TERISI 🔴 (UID: ${data.uid} - Belum Terdaftar?)`; element.style.color = '#dc3545';
                } else { throw new Error(`API Error: ${response.status}`); }
            } catch (error) { element.textContent = `TERISI 🔴 (UID: ${data.uid})`; element.style.color = '#dc3545'; }
        } else {
            element.textContent = 'KOSONG 🟢'; element.style.color = '#28a745';
        }
    }

    // Fungsi Helper untuk Menampilkan Alert
    let alertTimeout;
    function displayAlert(message) {
        if (!alertBanner || !alertMessage) return;
        alertMessage.textContent = message;
        alertBanner.style.display = 'block';
        clearTimeout(alertTimeout);
        alertTimeout = setTimeout(() => { alertBanner.style.display = 'none'; }, 7000); 
    }
}