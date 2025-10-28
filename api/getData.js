// api/getData.js (VERSI KOREKSI AKHIR UNTUK STABILITAS VERCEL)
import { InfluxDB, Point } from '@influxdata/influxdb-client';

// Ambil kunci rahasia dari Vercel Environment Variables
const url = process.env.INFLUXDB_URL;
const token = process.env.INFLUXDB_TOKEN;
const org = process.env.INFLUXDB_ORG;
const bucket = process.env.INFLUXDB_BUCKET;

// HAPUS INISIALISASI GLOBAL DI SINI (JANGAN DIULANG)
// const influxDB = new InfluxDB({ url, token });
// const queryApi = influxDB.getQueryApi(org);

// Fungsi utama API Handler
export default async function handler(request, response) {
    if (request.method !== 'GET') {
        return response.status(405).json({ message: 'Method Not Allowed' });
    }
    
    // --- INISIALISASI KLIEN DI DALAM HANDLER (FIX VERCEL) ---
    const influxDB = new InfluxDB({ url, token });
    const queryApi = influxDB.getQueryApi(org);
    // --------------------------------------------------------

    try {
        // Ambil parameter: ?id=kamar_1&field=suhu&range=1h&agg=10s
        const { id, field, range = '1h', agg = '10s' } = request.query;

        if (!id || !field) {
            return response.status(400).json({ message: 'ID perangkat dan field diperlukan' });
        }

        // --- QUERY FLUX UNTUK DATA GRAFIK ---
        const fluxQuery = `
          from(bucket: "${bucket}")
            |> range(start: -${range}) 
            |> filter(fn: (r) => r._measurement == "${id}" and r.perangkat == "${id}")
            |> filter(fn: (r) => r._field == "${field}")
            |> aggregateWindow(every: ${agg}, fn: mean, createEmpty: false) 
            |> yield(name: "mean")
        `;
        
        const data = [];
        await new Promise((resolve, reject) => {
            queryApi.queryRows(fluxQuery, {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    data.push({ x: o._time, y: o._value }); 
                },
                error(error) {
                    reject(error);
                },
                complete() {
                    resolve();
                }
            });
        });

        // --- QUERY FLUX UNTUK RATA-RATA HARI INI & KEMARIN ---
        const statsQuery = `
          yesterday = from(bucket: "${bucket}")
            |> range(start: -48h, stop: -24h)
            |> filter(fn: (r) => r._measurement == "${id}" and r.perangkat == "${id}" and r._field == "${field}")
            |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
            |> yield(name: "kemarin")
            
          today = from(bucket: "${bucket}")
            |> range(start: -24h)
            |> filter(fn: (r) => r._measurement == "${id}" and r.perangkat == "${id}" and r._field == "${field}")
            |> aggregateWindow(every: 1d, fn: mean, createEmpty: false)
            |> yield(name: "hari_ini")
        `;
        
        const stats = { hari_ini: null, kemarin: null };
        await new Promise((resolve, reject) => {
            queryApi.queryRows(statsQuery, {
                next(row, tableMeta) {
                    const o = tableMeta.toObject(row);
                    if (o.result === 'hari_ini' && o._value !== null) {
                        stats.hari_ini = o._value;
                    } else if (o.result === 'kemarin' && o._value !== null) {
                        stats.kemarin = o._value;
                    }
                },
                error(error) {
                    reject(error);
                },
                complete() {
                    resolve();
                }
            });
        });
        
        // Gabungkan hasil data grafik dan statistik
        return response.status(200).json({
            data: data,
            stats: stats
        });

    } catch (error) {
        console.error('Gagal menjalankan kueri InfluxDB:', error);
        // Error 500 akan dipicu di sini jika koneksi InfluxDB atau kueri gagal
        return response.status(500).json({ message: 'Internal Server Error: Gagal memuat data historis', error: error.message });
    }
}