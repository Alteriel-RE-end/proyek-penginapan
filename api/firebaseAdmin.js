// api/firebaseAdmin.js
import admin from 'firebase-admin';

// Ambil data JSON kunci rahasia dari Environment Variable
// PENTING: Gunakan try/catch di sini untuk menghindari crash saat Vercel mencoba membacanya
try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }

} catch (e) {
    console.error("Firebase Admin Initialization FAILED:", e.message);
    // Jika Vercel gagal memuat, kita log errornya
}

// Ekspor koneksi ke database Firestore
export const db = admin.firestore();