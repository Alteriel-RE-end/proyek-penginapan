// =================================================================
// == BAGIAN 1: KONFIGURASI FIREBASE
// =================================================================
// ⬇️⬇️⬇️ GANTI BAGIAN INI DENGAN firebaseConfig ANDA ⬇️⬇️⬇️
const firebaseConfig = {
  apiKey: "AIzaSy...YOUR...KEY...HERE..AIzaSyCeO7wuJuMcvLjv6geumpzmhUgEF09ytQs",
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