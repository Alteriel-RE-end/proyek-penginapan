// Import library InfluxDB
import { InfluxDB, Point } from '@influxdata/influxdb-client';

// Ambil kunci rahasia dari Vercel Environment Variables
const url = process.env.INFLUXDB_URL;
const token = process.env.INFLUXDB_TOKEN;
const org = process.env.INFLUXDB_ORG;
const bucket = process.env.INFLUXDB_BUCKET;

// Inisialisasi klien InfluxDB
// Kita buat klien di luar handler agar koneksi bisa dipakai ulang (lebih cepat)
const influxDB = new InfluxDB({ url, token });
const writeApi = influxDB.getWriteApi(org, bucket);

// Ini adalah fungsi utama API
export default async function handler(request, response) {
    // 1. Hanya izinkan metode POST
    if (request.method !== 'POST') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }

    try {
        // 2. Ambil data JSON yang dikirim oleh ESP32
        const data = request.body;
        console.log('Menerima data dari:', data.id);

        // 3. Cek apakah ada ID pengirim
        if (!data.id) {
            return response.status(400).json({ message: 'ID perangkat tidak ada' });
        }

        // 4. Buat 'Point' data untuk InfluxDB
        // 'id' (misal: "kamar_1") akan menjadi "tag" agar kita bisa memfilter
        const dataPoint = new Point(data.id)
            .tag('perangkat', data.id);

        // 5. Loop semua data sensor dan tambahkan ke Point
        // Kita 'delete' 'id' agar tidak ikut ditulis sebagai sensor
        const id = data.id;
        delete data.id;

        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                // Tambahkan sebagai 'field' (angka)
                dataPoint.floatField(key, data[key]);
            }
        }

        // 6. Tulis data ke InfluxDB
        writeApi.writePoint(dataPoint);
        
        // Penting: 'flush' untuk memastikan data terkirim sebelum fungsi serverless selesai
        await writeApi.flush();

        console.log(`Berhasil menyimpan data untuk ${id}`);
        // 7. Kirim balasan sukses
        return response.status(200).json({ message: `Data dari ${id} berhasil disimpan` });

    } catch (error) {
        // 8. Tangani jika ada error
        console.error('Gagal menyimpan ke InfluxDB:', error);
        return response.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
}