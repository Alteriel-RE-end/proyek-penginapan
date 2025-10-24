// api/_lib/firebaseAdmin.js
import admin from 'firebase-admin';

// Ambil data JSON kunci rahasia dari Environment Variable
const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);

// Cek apakah Firebase sudah diinisialisasi
if (!admin.apps.length) {
  // Jika belum, inisialisasi dengan kunci rahasia
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// Ekspor 'db', yaitu koneksi ke database Firestore
export const db = admin.firestore();