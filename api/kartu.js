// api/kartu.js (VERSI FINAL TERKOREKSI)
import { db } from './firebaseAdmin'; // PATH KOREKSI

const COLLECTION_NAME = 'kartu_tamu';

export default async function handler(request, response) {
    // --- PENGECEKAN KRITIS: DB Initialization ---
    if (!db) {
        console.error('ERROR: Database client not initialized. Check FIREBASE_ADMIN_SDK ENV.');
        return response.status(500).json({ message: 'Internal Server Error: Database client not initialized.' });
    }
    // ------------------------------------------

    // ==========================================================
    // AKSI 1: MELIHAT KARTU (SEMUA ATAU SATU PER SATU) (GET)
    // ==========================================================
    if (request.method === 'GET') {
        try {
            const { uid } = request.query;

            if (uid) {
                const docRef = db.collection(COLLECTION_NAME).doc(uid);
                const docSnap = await docRef.get();

                if (!docSnap.exists) {
                    return response.status(404).json({ message: 'Kartu tidak ditemukan' });
                } else {
                    return response.status(200).json([{ id: docSnap.id, ...docSnap.data() }]);
                }
            } else {
                const snapshot = await db.collection(COLLECTION_NAME).get();
                const cards = [];
                snapshot.forEach(doc => {
                    cards.push({ id: doc.id, ...doc.data() });
                });
                return response.status(200).json(cards);
            }
        } catch (error) {
            return response.status(500).json({ message: 'Gagal mengambil data kartu', error: error.message });
        }
    }

    // ==========================================================
    // AKSI 2: MENAMBAH KARTU BARU (POST)
    // ==========================================================
    if (request.method === 'POST') {
        try {
            const { uid, namaTamu } = request.body; 
            if (!uid) {
                return response.status(400).json({ message: 'UID kartu diperlukan' });
            }
            
            const namaUntukDisimpan = namaTamu || '[ Kosong ]';

            await db.collection(COLLECTION_NAME).doc(uid).set({
                namaTamu: namaUntukDisimpan
            });
            return response.status(201).json({ message: `Kartu ${uid} berhasil ditambahkan` });
        } catch (error) {
            return response.status(500).json({ message: 'Gagal menambah kartu', error: error.message });
        }
    }

    // ==========================================================
    // AKSI 3: MENGEDIT NAMA TAMU (PUT)
    // ==========================================================
    if (request.method === 'PUT') {
        try {
            const { uid, namaTamu } = request.body;
            if (!uid || !namaTamu) {
                return response.status(400).json({ message: 'UID dan namaTamu diperlukan' });
            }
            await db.collection(COLLECTION_NAME).doc(uid).update({
                namaTamu: namaTamu
            });
            return response.status(200).json({ message: `Kartu ${uid} berhasil diupdate` });
        } catch (error) {
            return response.status(500).json({ message: 'Gagal mengupdate kartu', error: error.message });
        }
    }

    // ==========================================================
    // AKSI 4: MENGHAPUS NAMA ATAU KARTU (DELETE)
    // ==========================================================
    if (request.method === 'DELETE') {
        try {
            const { uid } = request.body;
            if (!uid) {
                return response.status(400).json({ message: 'UID kartu diperlukan' });
            }

            const hapusPermanen = request.query.hapusPermanen === 'true';

            if (hapusPermanen) {
                await db.collection(COLLECTION_NAME).doc(uid).delete();
                return response.status(200).json({ message: `Kartu ${uid} berhasil dihapus permanen` });
            } else {
                await db.collection(COLLECTION_NAME).doc(uid).update({
                    namaTamu: '[ Kosong ]'
                });
                return response.status(200).json({ message: `Nama tamu di kartu ${uid} berhasil dikosongkan` });
            }

        } catch (error) {
            return response.status(500).json({ message: 'Gagal melakukan aksi hapus', error: error.message });
        }
    }
}