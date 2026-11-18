# Catatan handoff 18 November 2026

- Production terakhir yang diverifikasi menjalankan commit `1723b43` dan schema `d8e4a91b2201`; backend, frontend, gateway, worker, scheduler, Redis, dan tunnel sehat.
- Backup privat, restore schema aplikasi, dan rehearsal migrasi tersebut berhasil. Verifikasi migrasi production mempertahankan 17.451 baris data lama.
- Perubahan source dan catatan lain yang disertakan bersama handoff ini **belum diuji ulang secara menyeluruh**. Pemilik meminta seluruh pekerjaan terbaru segera di-push sebelum komputer dimatikan. Validasi berikutnya diserahkan ke CI.
- Migrasi tambahan `e7b2c80d913a`, `f4c7b91a026e`, dan `c3d9e25b4a60` ikut disimpan dalam repositori, tetapi **belum diterapkan ke production**. Izin migrasi sebelumnya hanya sampai `d8e4a91b2201`; pemeriksaan schema deployment tetap berlaku.
- CI/CD setelah push terakhir dibiarkan berjalan mandiri dan tidak dipantau, sesuai permintaan pemilik. Status CI dan deployment terbaru harus dilihat pada GitHub Actions.
- Secrets, kredensial operator, dan arsip database privat tidak dimasukkan ke Git.
