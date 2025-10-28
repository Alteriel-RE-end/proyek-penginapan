// api/firebaseAdmin.js (FINAL VERSION)

import admin from 'firebase-admin';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Kita pastikan inisialisasi hanya terjadi sekali (Singleton Pattern)
if (!getApps().length) { // Menggunakan getApps() untuk cek jika sudah diinisialisasi
    try {
        // Ambil data JSON kunci rahasia dari Environment Variable
        const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK);
        
        // Inisialisasi Firebase Admin
        initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        
        console.log("Firebase Admin SDK initialized successfully.");

    } catch (e) {
        // Jika Vercel gagal memuat, ini menangkap errornya
        console.error("FIREBASE ADMIN INITIALIZATION FAILED (Check ENV VAR format):", e.message);
    }
}

// Ekspor instance Firestore dan Admin
// Jika inisialisasi gagal (getApps().length === 0), kita ekspor null untuk mencegah crash
const app = getApps().length > 0 ? getApps()[0] : null;

// Ekspor koneksi ke database Firestore
export const db = app ? getFirestore(app) : null;

// Ekspor library admin untuk digunakan di API lain (misalnya Auth)
export const firebaseAdmin = admin;