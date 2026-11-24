# Blue Bloom Birthday Website

Website ulang tahun bertema biru dengan bunga daisy dan tulip, kue ulang tahun yang dapat ditiup melalui mikrofon, surat, galeri Polaroid, dan lagu ulang tahun yang disertakan.

## Menjalankan
1. Ekstrak ZIP.
2. Jalankan website melalui localhost atau hosting HTTPS agar izin mikrofon tersedia.
3. Tekan tombol **Play music** untuk memutar lagu. Browser biasanya tidak mengizinkan audio diputar otomatis sebelum ada interaksi pengunjung.

## File lagu
Lagu sudah disertakan di `assets/music/birthday-song.mp3`. Tombol musik di bagian atas halaman berfungsi untuk memutar dan menjeda lagu tersebut.

## Ganti foto
Buka `index.html`, cari bagian galeri dengan `id="galleryPile"`. Ganti nilai `src` pada tag `<img>` dengan foto milikmu. Simpan foto di folder `assets/photos/` dan gunakan path seperti `assets/photos/foto-1.jpg`.

## Ganti surat
Di `index.html`, cari `class="letter-paper"` lalu ubah teks surat.

## GitHub Pages
Upload seluruh isi folder website ke repository GitHub, lalu atur:
Settings -> Pages -> Deploy from a branch -> Branch `main` -> Folder `/ (root)` -> Save.
