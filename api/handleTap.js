// api/handleTap.js
import { db } from './firebaseAdmin'; // Helper Firebase kita
import mqtt from 'mqtt'; // Library MQTT

// Nama koleksi di Firestore (pastikan konsisten)
const KARTU_COLLECTION = 'kartu_tamu';
const LOKASI_COLLECTION = 'status_lokasi'; // KOLEKSI BARU untuk status hunian

// Kredensial HiveMQ dari Environment Variables
const mqttOptions = {
    host: process.env.HIVEMQ_HOST,
    port: 8883, // MQTTS Port
    protocol: 'mqtts',
    username: process.env.HIVEMQ_USER,
    password: process.env.HIVEMQ_PASSWORD,
    clientId: `vercel_api_${Math.random().toString(16).substr(2, 8)}` // ID unik
};

// Fungsi helper untuk publish MQTT
function publishStatus(topic, status, uid) {
    const payload = JSON.stringify({ status, uid });
    const client = mqtt.connect(mqttOptions);

    client.on('connect', () => {
        client.publish(topic, payload, { qos: 1 }, (error) => { // qos 1: Pastikan terkirim
            if (error) {
                console.error('MQTT Publish Error:', error);
            } else {
                console.log(`MQTT Published to ${topic}: ${payload}`);
            }
            client.end(); // Tutup koneksi setelah publish
        });
    });

    client.on('error', (err) => {
        console.error('MQTT Connection Error:', err);
        client.end();
    });
}

// Fungsi utama API Handler
export default async function handler(request, response) {
    // Hanya izinkan POST
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { uid, location } = request.body; // Ambil data dari ESP32

        if (!uid || !location) {
            return response.status(400).json({ success: false, reason: 'UID dan Lokasi diperlukan' });
        }

        // Dapatkan referensi dokumen di Firestore
        const kartuDocRef = db.collection(KARTU_COLLECTION).doc(uid);
        const lokasiDocRef = db.collection(LOKASI_COLLECTION).doc(location); // Dokumen untuk lokasi ini

        // Dapatkan data saat ini (transaksi agar aman dari race condition)
        const result = await db.runTransaction(async (transaction) => {
            const kartuDoc = await transaction.get(kartuDocRef);
            const lokasiDoc = await transaction.get(lokasiDocRef);

            // Cek apakah kartu terdaftar
            if (!kartuDoc.exists) {
                // KIRIM ALERT KE WEB
                publishAlert('unregistered_card', { uid: uid, location: location });
                // KASIH TAHU ESP UNTUK ALARM
                return { success: false, reason: 'Kartu tidak terdaftar', alarm: true }; // Tambah flag alarm: true
            }

            const kartuData = kartuDoc.data();
            const lokasiData = lokasiDoc.exists ? lokasiDoc.data() : { isOccupied: false, occupiedByUID: null }; // Default jika lokasi belum ada

            const kartuLokasiSaatIni = kartuData.currentLocation || null; // Di mana kartu ini sekarang?
            const lokasiTerisiOleh = lokasiData.occupiedByUID || null; // Siapa yang mengisi lokasi target?

            let responsePayload = {};
            let topic = `${location}/status`; // Topic MQTT target

            // --- Logika Aturan ---

            // Kasus 1: Check-in ke lokasi kosong OLEH kartu yang sedang tidak aktif
            if (!lokasiData.isOccupied && !kartuLokasiSaatIni) {
                transaction.update(kartuDocRef, { currentLocation: location });
                transaction.set(lokasiDocRef, { isOccupied: true, occupiedByUID: uid }, { merge: true }); // set dgn merge jika doc blm ada
                responsePayload = { success: true, action: 'checkin', message: 'Check-in berhasil' };
                publishStatus(topic, "TERISI", uid);
            }
            // Kasus 2: Check-out dari lokasi OLEH kartu yang benar
            else if (lokasiData.isOccupied && lokasiTerisiOleh === uid && kartuLokasiSaatIni === location) {
                transaction.update(kartuDocRef, { currentLocation: null }); // Kosongkan lokasi kartu
                transaction.update(lokasiDocRef, { isOccupied: false, occupiedByUID: null });
                responsePayload = { success: true, action: 'checkout', message: 'Check-out berhasil' };
                publishStatus(topic, "KOSONG", "");
            }
            // Kasus 3: Ditolak - Lokasi sudah terisi kartu lain
            else if (lokasiData.isOccupied && lokasiTerisiOleh !== uid) {
                responsePayload = { success: false, reason: `Lokasi sudah terisi oleh kartu ${lokasiTerisiOleh}` };
            }
            // Kasus 4: Ditolak - Kartu ini masih aktif di tempat lain
            else if (!lokasiData.isOccupied && kartuLokasiSaatIni && kartuLokasiSaatIni !== location) {
                responsePayload = { success: false, reason: `Kartu ini masih aktif di ${kartuLokasiSaatIni}. Checkout dulu.` };
            }
             // Kasus 5: Ditolak - Kartu salah untuk checkout (Lokasi terisi A, tapi B tap)
            else if (lokasiData.isOccupied && lokasiTerisiOleh === uid && kartuLokasiSaatIni !== location) {
                 // Ini aneh, data tidak konsisten. Anggap gagal.
                 responsePayload = { success: false, reason: 'Data tidak konsisten. Kartu tercatat di lokasi lain.' };
            }
             // Kasus Lain (misalnya tap kartu yg sama saat checkin, atau tap kartu kosong di lokasi kosong)
            else {
                 responsePayload = { success: false, reason: 'Aksi tap tidak valid.' };
            }

            return responsePayload;
        });

        // Kirim balasan ke ESP32
        return response.status(result.success ? 200 : 400).json(result);

    } catch (error) {
        console.error('Error handling tap:', error);
        return response.status(500).json({ success: false, reason: 'Internal Server Error', error: error.message });
    }
}