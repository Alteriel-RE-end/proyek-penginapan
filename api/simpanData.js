// api/simpanData.js (VERSI KOREKSI UNTUK STABILITAS VERCEL)

import { InfluxDB, Point } from '@influxdata/influxdb-client';

// Ambil kunci rahasia dari Vercel Environment Variables
const url = process.env.INFLUXDB_URL;
const token = process.env.INFLUXDB_TOKEN;
const org = process.env.INFLUXDB_ORG;
const bucket = process.env.INFLUXDB_BUCKET;

// HAPUS INISIALISASI GLOBAL DI SINI
// const influxDB = new InfluxDB({ url, token });
// const writeApi = influxDB.getWriteApi(org, bucket);

// Ini adalah fungsi utama API
export default async function handler(request, response) {
    // 1. Hanya izinkan metode POST
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    // --- INISIALISASI KLIEN DI DALAM HANDLER (FIX UNTUK VERCEL) ---
    const influxDB = new InfluxDB({ url, token });
    const writeApi = influxDB.getWriteApi(org, bucket);
    // ----------------------------------------------------------------

    try {
        // 2. Ambil data JSON yang dikirim oleh ESP32
        const data = request.body;
        
        if (!data.id) {
            return response.status(400).json({ message: 'ID perangkat tidak ada' });
        }

        // 3. Buat 'Point' data untuk InfluxDB
        const dataPoint = new Point(data.id)
            .tag('perangkat', data.id); // Tagging perangkat

        const id = data.id;
        delete data.id;

        // 4. Loop semua data sensor
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                // Tambahkan sebagai 'field' (angka)
                dataPoint.floatField(key, data[key]);
            }
        }

        // 5. Tulis data ke InfluxDB dan flush
        writeApi.writePoint(dataPoint);
        await writeApi.flush();

        console.log(`Berhasil menyimpan data untuk ${id}`);
        // 6. Kirim balasan sukses
        return response.status(200).json({ message: `Data dari ${id} berhasil disimpan` });

    } catch (error) {
        // 7. Tangani jika ada error InfluxDB
        console.error('Gagal menyimpan ke InfluxDB:', error);
        return response.status(500).json({ message: 'Internal Server Error: Gagal menyimpan data sensor', error: error.message });
    }
}