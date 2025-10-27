// api/getSettings.js
import { db } from './_lib/firebaseAdmin';

const SETTINGS_COLLECTION = 'pengaturan_unit';

export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { id } = request.query; // Menerima id=? (misal: id=kamar_1_settings)

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
        console.error('Gagal mengambil pengaturan:', error);
        return response.status(500).json({ message: 'Gagal mengambil pengaturan.', error: error.message });
    }
}