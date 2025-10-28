// api/handleTap.js (VERSI FINAL TERKOREKSI)
import { db } from './firebaseAdmin'; 
import mqtt from 'mqtt'; 

// Nama koleksi di Firestore
const KARTU_COLLECTION = 'kartu_tamu';
const LOKASI_COLLECTION = 'status_lokasi';
const ALERT_TOPIC = 'system/alerts'; // Topik Alert

// Kredensial HiveMQ dari Environment Variables
const mqttOptions = {
    host: process.env.HIVEMQ_HOST,
    port: 8883, // MQTTS Port
    protocol: 'mqtts',
    username: process.env.HIVEMQ_USER,
    password: process.env.HIVEMQ_PASSWORD,
    clientId: `vercel_api_${Math.random().toString(16).substr(2, 8)}`
};

// Fungsi helper untuk publish Status (Check-in/Checkout)
function publishStatus(topic, status, uid) {
    const payload = JSON.stringify({ status, uid });
    const client = mqtt.connect(mqttOptions);

    client.on('connect', () => {
        client.publish(topic, payload, { qos: 1 }, (error) => {
            if (error) { console.error('MQTT Publish Error:', error); }
            else { console.log(`MQTT Status Published to ${topic}: ${payload}`); }
            client.end();
        });
    });
    client.on('error', (err) => { console.error('MQTT Connection Error:', err); client.end(); });
}

// --- FUNGSI BARU/HILANG: publishAlert ---
function publishAlert(alertType, data) {
    const payload = JSON.stringify({ type: alertType, ...data });
    const client = mqtt.connect(mqttOptions);
    client.on('connect', () => {
        client.publish(ALERT_TOPIC, payload, { qos: 1 }, (error) => {
            if (error) console.error('MQTT Alert Publish Error:', error);
            else console.log(`MQTT Alert Published: ${payload}`);
            client.end();
        });
    });
    client.on('error', (err) => { console.error('MQTT Alert Connection Error:', err); client.end(); });
}
// --- AKHIR FUNGSI BARU/HILANG ---

// Fungsi utama API Handler
export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }
    
    // --- PENGECEKAN KRITIS: DB Initialization ---
    if (!db) {
        console.error('ERROR: Database client not initialized. Check FIREBASE_ADMIN_SDK ENV.');
        return response.status(500).json({ success: false, reason: 'Database client not initialized.', error: 'DB_INIT_FAILED' });
    }
    // ------------------------------------------


    try {
        const { uid, location } = request.body;
        
        // ... (sisanya sama) ...

        // Dapatkan referensi dokumen di Firestore
        const kartuDocRef = db.collection(KARTU_COLLECTION).doc(uid);
        const lokasiDocRef = db.collection(LOKASI_COLLECTION).doc(location);

        // Dapatkan data saat ini (transaksi agar aman dari race condition)
        const result = await db.runTransaction(async (transaction) => {
            const kartuDoc = await transaction.get(kartuDocRef);
            const lokasiDoc = await transaction.get(lokasiDocRef);

            // Cek apakah kartu terdaftar
            if (!kartuDoc.exists) {
                // KIRIM ALERT KE WEB (Halaman Publik)
                publishAlert('unregistered_card', { uid: uid, location: location }); 
                // KASIH TAHU ESP UNTUK ALARM
                return { success: false, reason: 'Kartu tidak terdaftar', alarm: true }; 
            }
            
            // ... (sisanya Logika Aturan Check-in/Checkout sama seperti sebelumnya) ...
            
            const kartuData = kartuDoc.data();
            const lokasiData = lokasiDoc.exists ? lokasiDoc.data() : { isOccupied: false, occupiedByUID: null }; 

            const kartuLokasiSaatIni = kartuData.currentLocation || null; 
            const lokasiTerisiOleh = lokasiData.occupiedByUID || null; 

            let responsePayload = {};
            let topic = `${location}/status`; 

            // Kasus 1: Check-in ke lokasi kosong OLEH kartu yang sedang tidak aktif
            if (!lokasiData.isOccupied && !kartuLokasiSaatIni) {
                transaction.update(kartuDocRef, { currentLocation: location });
                transaction.set(lokasiDocRef, { isOccupied: true, occupiedByUID: uid }, { merge: true }); 
                responsePayload = { success: true, action: 'checkin', message: 'Check-in berhasil' };
                publishStatus(topic, "TERISI", uid);
            }
            // Kasus 2: Check-out dari lokasi OLEH kartu yang benar
            else if (lokasiData.isOccupied && lokasiTerisiOleh === uid && kartuLokasiSaatIni === location) {
                transaction.update(kartuDocRef, { currentLocation: null });
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
            // Kasus 5: Ditolak - Kartu salah untuk checkout 
            else if (lokasiData.isOccupied && lokasiTerisiOleh === uid && kartuLokasiSaatIni !== location) {
                 responsePayload = { success: false, reason: 'Data tidak konsisten. Kartu tercatat di lokasi lain.' };
            }
            // Kasus Lain 
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