// api/saveSettings.js
import { db } from './_lib/firebaseAdmin';

// Nama koleksi untuk pengaturan global (hanya satu dokumen)
const SETTINGS_COLLECTION = 'pengaturan_unit';
const KAMAR1_DOC_ID = 'kamar_1_settings'; // ID dokumen untuk Kamar 1

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { relayNames } = request.body; // Menerima objek {RELAY1: 'Lampu...', RELAY2: 'Kipas', ...}

        if (!relayNames || Object.keys(relayNames).length !== 4) {
            return response.status(400).json({ message: 'Data nama relay tidak lengkap.' });
        }

        // 1. Simpan nama relay ke dokumen Kamar 1 di Firestore
        await db.collection(SETTINGS_COLLECTION).doc(KAMAR1_DOC_ID).set({
            relayNames: relayNames
        }, { merge: true }); // Gunakan merge:true agar tidak menimpa setting lain di dokumen ini

        return response.status(200).json({ message: 'Nama relay berhasil disimpan.' });

    } catch (error) {
        console.error('Gagal menyimpan pengaturan:', error);
        return response.status(500).json({ message: 'Gagal menyimpan pengaturan.', error: error.message });
    }
}