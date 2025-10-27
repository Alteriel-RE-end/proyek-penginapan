// api/kontrolRelay.js
import mqtt from 'mqtt';

// Ambil kredensial HiveMQ dari Environment Variables Vercel
const mqttOptions = {
    // Kredensial yang kita atur di Vercel Settings
    host: process.env.4d8b5862577245479751349efcbff1a3.s1.eu.hivemq.cloud,
    port: 8883,
    protocol: 'mqtts',
    username: process.env.Hesp32_user,
    password: process.env.i2E45678,
    clientId: `vercel_control_${Math.random().toString(16).substr(2, 8)}`
};

// Topik tujuan (sesuai yang di-subscribe oleh ESP32)
const RELAY_TOPIC = 'kamar_1/kontrol'; 

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        const { command } = request.body; // command = "RELAY1_ON", "RELAY3_OFF", dsb.

        if (!command) {
            return response.status(400).json({ message: 'Perintah (command) diperlukan.' });
        }

        const client = mqtt.connect(mqttOptions);
        
        // Bungkus MQTT di Promise agar Vercel tahu kapan harus selesai
        await new Promise((resolve, reject) => {
            client.on('connect', () => {
                client.publish(RELAY_TOPIC, command, { qos: 1 }, (error) => { // qos 1: Pastikan terkirim
                    client.end(); // Tutup koneksi setelah publish
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                });
            });

            client.on('error', (err) => {
                client.end();
                reject(new Error(`MQTT Connection/Publish Error: ${err.message}`));
            });
        });

        // Jika berhasil terpublish ke HiveMQ
        return response.status(200).json({ message: `Perintah ${command} berhasil dikirim via MQTT.` });

    } catch (error) {
        console.error('Error Kontrol Relay:', error.message);
        // Penting: Memberikan respon 500 dengan JSON agar frontend tahu errornya
        return response.status(500).json({ message: 'Gagal mengirim perintah', error: error.message });
    }
}