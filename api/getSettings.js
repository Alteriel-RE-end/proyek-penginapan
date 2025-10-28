// api/getSettings.js (Koreksi untuk mencegah crash)
import { db } from './firebaseAdmin';

const SETTINGS_COLLECTION = 'pengaturan_unit';
const KAMAR1_DOC_ID = 'kamar_1_settings'; // Digunakan untuk referensi di sini, meskipun ID datang dari query

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    // --- Pengecekan Kritis ---
    // Jika Firebase Admin gagal diinisialisasi (karena ENV VARS salah), db akan menjadi null.
    // Kita harus menghentikan fungsi di sini sebelum memanggil db.collection.
    if (!db) {
        console.error('ERROR: Database client not initialized. Check FIREBASE_ADMIN_SDK ENV.');
        return response.status(500).json({ message: 'Internal Server Error: Database client not initialized.' });
    }

    try {
        const { id } = request.query;

        if (!id) {
            return response.status(400).json({ message: 'ID dokumen diperlukan.' });
        }

        const docRef = db.collection(SETTINGS_COLLECTION).doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            // Kirim balik objek kosong jika pengaturan belum ada (default)
            return response.status(200).json({ relayNames: {} }); 
        }

        // Kirim seluruh data dokumen
        return response.status(200).json(doc.data());

    } catch (error) {
        console.error('Gagal mengambil pengaturan (Firestore Query Error):', error);
        return response.status(500).json({ message: 'Gagal mengambil pengaturan. Cek log Firestore.' });
    }
}