// api/kartu.js
import { db } from './_lib/firebaseAdmin';

// Sesuai kesepakatan, nama koleksi kita adalah 'kartu_tamu'
const COLLECTION_NAME = 'kartu_tamu';

export default async function handler(request, response) {
    // Nanti kita akan tambahkan cek login admin di sini
    // Untuk sekarang, kita buat API-nya dulu

    // ==========================================================
    // AKSI 1: MELIHAT SEMUA KARTU (GET)
    // ==========================================================
    if (request.method === 'GET') {
        try {
            const snapshot = await db.collection(COLLECTION_NAME).get();
            const cards = [];
            snapshot.forEach(doc => {
                cards.push({ id: doc.id, ...doc.data() });
            });
            return response.status(200).json(cards);
        } catch (error) {
            return response.status(500).json({ message: 'Gagal mengambil data', error: error.message });
        }
    }

    // ==========================================================
    // AKSI 2: MENAMBAH KARTU BARU (POST)
    // ==========================================================
    if (request.method === 'POST') {
        try {
            const { uid, namaTamu } = request.body; // <-- PERBAIKAN 1: Baca juga namaTamu
            if (!uid) {
                return response.status(400).json({ message: 'UID kartu diperlukan' });
            }
            
            // Tentukan nama yang akan disimpan (default ke [ Kosong ] jika tidak ada)
            const namaUntukDisimpan = namaTamu || '[ Kosong ]';

            // Buat dokumen baru dengan nama 'uid'
            await db.collection(COLLECTION_NAME).doc(uid).set({
                namaTamu: namaUntukDisimpan // <-- PERBAIKAN 2: Gunakan nama dari input
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
            // Update dokumen yang sudah ada
            await db.collection(COLLECTION_NAME).doc(uid).update({
                namaTamu: namaTamu
            });
            return response.status(200).json({ message: `Kartu ${uid} berhasil diupdate` });
        } catch (error) {
            return response.status(500).json({ message: 'Gagal mengupdate kartu', error: error.message });
        }
    }

    // ==========================================================
    // AKSI 4: MENGHAPUS NAMA TAMU / CHECKOUT (DELETE)
    // ==========================================================
    if (request.method === 'DELETE') {
        try {
            const { uid } = request.body;
            if (!uid) {
                return response.status(400).json({ message: 'UID kartu diperlukan' });
            }
            // Kita tidak hapus kartunya, tapi kita 'reset' namaTamu-nya
            await db.collection(COLLECTION_NAME).doc(uid).update({
                namaTamu: '[ Kosong ]'
            });
            return response.status(200).json({ message: `Nama tamu di kartu ${uid} berhasil dihapus` });
        } catch (error) {
            return response.status(500).json({ message: 'Gagal menghapus nama tamu', error: error.message });
        }
    }

    // Jika metode lain (selain GET, POST, PUT, DELETE)
    return response.status(405).json({ message: 'Method Not Allowed' });
}