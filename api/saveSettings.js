// api/saveSettings.js
import { db } from './firebaseAdmin.js';

const SETTINGS_COLLECTION = 'pengaturan_unit';
const KAMAR1_DOC_ID = 'kamar_1_settings'; 

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    // --- Pengecekan Kritis: Pastikan DB Aktif ---
    if (!db) {
        console.error('ERROR: Database client not initialized. Check FIREBASE_ADMIN_SDK ENV.');
        return response.status(500).json({ message: 'Internal Server Error: Database client not initialized.' });
    }
    // ------------------------------------------

    try {
        const { relayNames } = request.body; 

        if (!relayNames || Object.keys(relayNames).length !== 4) {
            return response.status(400).json({ message: 'Data nama relay tidak lengkap.' });
        }

        // Simpan nama relay ke dokumen Kamar 1 di Firestore
        await db.collection(SETTINGS_COLLECTION).doc(KAMAR1_DOC_ID).set({
            relayNames: relayNames
        }, { merge: true }); 

        return response.status(200).json({ message: 'Nama relay berhasil disimpan.' });

    } catch (error) {
        console.error('Gagal menyimpan pengaturan:', error);
        return response.status(500).json({ message: 'Gagal menyimpan pengaturan.', error: error.message });
    }
}