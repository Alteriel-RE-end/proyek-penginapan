// api/kartu.js
import { db } from './firebaseAdmin';

// Sesuai kesepakatan, nama koleksi kita adalah 'kartu_tamu'
const COLLECTION_NAME = 'kartu_tamu';

export default async function handler(request, response) {
    // Nanti kita akan tambahkan cek login admin di sini
    // Untuk sekarang, kita buat API-nya dulu

    // ==========================================================
    // AKSI 1: MELIHAT KARTU (SEMUA ATAU SATU PER SATU) (GET)
    // ==========================================================
    if (request.method === 'GET') {
        try {
            // Cek apakah ada query parameter 'uid'
            const { uid } = request.query;

            if (uid) {
                // --- AMBIL SATU KARTU BERDASARKAN UID ---
                const docRef = db.collection(COLLECTION_NAME).doc(uid);
                const docSnap = await docRef.get();

                if (!docSnap.exists) {
                    // Jika UID tidak ditemukan, kirim array kosong (agar frontend tidak error)
                    // atau bisa juga kirim 404
                    return response.status(404).json({ message: 'Kartu tidak ditemukan' });
                    // return response.status(200).json([]);
                } else {
                    // Kirim data kartu tunggal dalam array (agar format konsisten)
                    return response.status(200).json([{ id: docSnap.id, ...docSnap.data() }]);
                }
            } else {
                // --- AMBIL SEMUA KARTU (Logika Lama) ---
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
    } // Akhir blok GET

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
    // AKSI 4: MENGHAPUS NAMA ATAU KARTU (DELETE)
    // ==========================================================
    if (request.method === 'DELETE') {
        try {
            // Ambil UID dari body request
            const { uid } = request.body;
            if (!uid) {
                return response.status(400).json({ message: 'UID kartu diperlukan' });
            }

            // Cek apakah ada query parameter '?hapusPermanen=true'
            const hapusPermanen = request.query.hapusPermanen === 'true';

            if (hapusPermanen) {
                // --- HAPUS KARTU PERMANEN ---
                await db.collection(COLLECTION_NAME).doc(uid).delete();
                return response.status(200).json({ message: `Kartu ${uid} berhasil dihapus permanen` });
            } else {
                // --- KOSONGKAN NAMA TAMU SAJA ---
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