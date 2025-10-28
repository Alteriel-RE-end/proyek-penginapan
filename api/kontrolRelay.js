// api/kontrolRelay.js
import mqtt from 'mqtt';

// Ambil kredensial HiveMQ dari Environment Variables Vercel
const mqttOptions = {
    // Kredensial yang kita atur di Vercel Settings
    host: process.env.HIVEMQ_HOST, 
    port: 8883,
    protocol: 'mqtts',
    username: process.env.HIVEMQ_USER,
    password: process.env.HIVEMQ_PASSWORD, 
    clientId: `vercel_control_${Math.random().toString(16).substr(2, 8)}`
};

// Topik tujuan (sesuai yang di-subscribe oleh ESP32)
const RELAY_TOPIC = 'kamar_1/kontrol'; 

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { command } = request.body; 

        if (!command) {
            return response.status(400).json({ message: 'Perintah (command) diperlukan.' });
        }

        const client = mqtt.connect(mqttOptions);
        
        let connected = false;

        // Bungkus MQTT di Promise agar Vercel tahu kapan harus selesai
        await new Promise((resolve, reject) => {
            
            // Timeout untuk mencegah fungsi menggantung selamanya
            const timeout = setTimeout(() => {
                client.end();
                reject(new Error('MQTT Timeout: Koneksi ke broker terlalu lambat atau diblokir.'));
            }, 5000); // Batas waktu 5 detik

            client.on('connect', () => {
                connected = true;
                client.publish(RELAY_TOPIC, command, { qos: 1 }, (error) => {
                    clearTimeout(timeout);
                    client.end();
                    if (error) { reject(error); } else { resolve(); }
                });
            });

            // Tambahkan pengecekan error sebelum connect
            client.on('error', (err) => {
                clearTimeout(timeout);
                client.end();
                // Hanya reject jika belum pernah terhubung sebelumnya
                if (!connected) { reject(new Error(`MQTT Connection Error: ${err.message}`)); }
            });

        });

        // Jika berhasil terpublish ke HiveMQ
        return response.status(200).json({ message: `Perintah ${command} berhasil dikirim via MQTT.` });

    } catch (error) {
        console.error('Error Kontrol Relay:', error.message);
        // Penting: Memberikan respon 500 dengan JSON agar frontend tahu errornya
        return response.status(500).json({ message: `Gagal mengirim perintah: ${error.message}`, error: error.message });
    }
}