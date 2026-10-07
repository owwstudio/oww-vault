# OWW Portfolio — Vite + Pug

Starter manual code untuk portfolio satu halaman: navbar, hero, galeri infinite, metadata project, dan click sound.

## Menjalankan di Mac

Gunakan Node.js 24 LTS. File `.nvmrc` disediakan jika kamu memakai nvm.

```bash
cd portfolio-vite
npm ci
npm run dev
```

Buka URL localhost yang muncul di terminal. Buka folder `portfolio-vite` sebagai workspace di VS Code atau Codex Desktop.

```bash
npm run build
npm run preview
```

Hasil production ada di `dist/`. Ini website statis tanpa server aplikasi atau database.

## File yang biasanya diedit

| File | Kegunaan |
| --- | --- |
| `src/templates/index.pug` | Struktur halaman dan kartu project |
| `src/templates/partials/navbar.pug` | Logo, kontak, sound toggle, dan CTA navbar |
| `src/styles/main.scss` | Tokens, layout, responsive, hover |
| `src/data/projects.json` | Konten, gambar, dan URL project |
| `src/scripts/gallery.js` | Lenis, intro, loop, project aktif, navigasi |
| `src/scripts/inspect.js` | Cursor Inspect, popup project, animasi buka/tutup |
| `src/scripts/sound.js` | Original synthesized tick/click dan toggle audio |
| `src/scripts/main.js` | Import dan inisialisasi |
| `vite.config.js` | Compile Pug melalui Vite dan reload template/data |
| `public/assets/` | Aset lokal logo dan ikon dari Figma |

Pug dikompilasi menjadi HTML melalui hook `transformIndexHtml` milik Vite. Dependensi `pug` dipakai hanya saat development/build. File `index.html` adalah entry kecil; edit halaman melalui Pug. Perubahan Pug dan JSON memicu full reload, perubahan SCSS memakai HMR Vite.

## Memasukkan project asli

Desain Figma memakai placeholder abu-abu. Galeri saat ini berisi 14 project dengan deskripsi dan tags dummy untuk memeriksa layout. `Statement` menggunakan copy contoh dari Figma. Ganti konten dummy, gambar, dan URL dengan informasi project asli sebelum publish.

Letakkan gambar di `public/projects/`. Contoh satu item data:

```json
{
  "id": "nama-project",
  "title": "Nama Project",
  "description": "Ringkasan pekerjaan dan peran kamu.",
  "tags": ["Webflow", "GSAP"],
  "image": "./projects/nama-project.webp",
  "imageAlt": "Tampilan homepage Nama Project",
  "url": "https://domain-project.com/"
}
```

Setiap `id` harus unik. Sediakan setidaknya satu item, dan gunakan `tags: []` jika tidak ada tags. Isi URL hanya dengan alamat website project yang sudah diverifikasi. Tombol Visit website membuka URL di tab baru. Klik kartu selalu membuka popup Inspect, yang kontennya masih kosong. Perubahan data dirender ulang saat build, sehingga konten project sudah ada di HTML tanpa menunggu JavaScript.

Logo dan ikon asli diekspor dari node Figma sebagai SVG lokal tanpa mengubah desain. Tidak ada URL aset Figma sementara di kode.

## Cara kerja interaksi

- Intro dimulai dari frame hero. Sejak scroll pertama, H1 mengecil dan bergerak ke 24 px di bawah kontak navbar selama 1,1 detik dengan easing `power2.inOut`, agar akselerasi dan perlambatannya terasa lebih bertahap. Transform memakai judul yang sama dengan susunan baris tetap. Pada mobile, H1 mengikuti bawah navbar karena kontak disembunyikan.
- H1 menetap selama galeri berulang, termasuk saat scroll ke arah sebaliknya. Kembali ke awal intro atau menekan logo mengembalikan H1 ke posisi hero; resize menghitung ulang posisi sticky.
- Satu instance Lenis aktif, digerakkan hanya oleh GSAP ticker. Tidak ada RAF kedua.
- Galeri menggunakan tiga grup tetap: satu grup utama dan dua salinan visual. Jumlah DOM tidak bertambah saat scroll.
- Panjang native scroll dibuat kelipatan panjang satu grup; posisi visual memakai modulo yang sama untuk menyamakan sambungan kedua arah.
- Lebar kartu mengikuti jarak titik tengahnya dari tengah viewport, dengan interpolasi smoothstep: 54,6–66,7% pada desktop dan 84–100% pada mobile. Kartu yang masuk/keluar lebih kecil; lebar maksimum berada tepat di tengah. Rumus yang sama dipakai pada intro dan loop, dan sisa target scroll diteruskan setelah posisi di-rebase.
- Metadata berada di kiri bawah viewport dan baru berganti ketika titik tengah kartu mencapai/melewati tengah viewport, termasuk scroll dua arah dan sambungan loop. Navigasi project menempatkan titik tengah kartu di tengah viewport; fokus keyboard pada kartu juga membawanya ke tengah. Klik pointer membuka Inspect langsung dari posisi kartu. Pada mobile, panel diberi jarak 20 px dari bawah ditambah safe area. Semua project memiliki deskripsi dan tags dummy untuk pemeriksaan layout.
- Navbar hanya menampilkan email. Ikon panah kartu muncul melalui opacity dan transform selama 0,35 detik ketika slot di-hover atau kartu mendapat fokus keyboard. Pada perangkat tanpa hover, ikon tetap terlihat; reduced motion menonaktifkan transisinya.
- Hover kartu pada perangkat dengan mouse mengganti cursor dengan label Inspect yang mengikuti pointer. Klik membuka native dialog kosong dengan fokus keyboard terkurung di dalamnya. Fase visual galeri disimpan sebelum Lenis dihentikan, sehingga reset native scroll/fokus tidak mengubah posisi kartu. Panel memakai sisi kanan kartu yang diklik sebagai anchor tetap, lalu melebar ke kiri selama 0,85 detik (`power3.inOut`). Margin kiri popup sama dengan margin kanannya: 74 px desktop dan 56 px mobile. Tinggi/posisi vertikal menyesuaikan viewport. Latar menjadi putih penuh tanpa blur. Gambar kartu memudar selama ekspansi; zoom hover disimpan agar handoff saat tutup tetap sama. Tombol tutup, Escape, dan klik di luar membalik timeline yang sama menuju posisi kartu yang tersimpan, termasuk jika ekspansi belum selesai. Setelah tutup, posisi scroll dipulihkan tanpa meneruskan momentum sebelumnya. Kartu asli menerima fokus kembali tanpa scroll; klik salinan loop mengembalikan fokus ke area galeri, bukan kartu asli di luar layar. Resize menghitung ulang geometri sambil mempertahankan progress/arah animasi; reduced motion membuka/menutup langsung. Pada touch, kartu tetap dapat membuka popup tanpa cursor khusus.
- Tick hanya dimainkan ketika project aktif berganti, dengan jeda minimum 140 ms. Click digunakan saat memilih/membuka project.
- Sound default off. Tombol garis di kiri Schedule an Intro membuka AudioContext melalui user gesture; saat aktif, fase gelombang mengalir dari kiri ke kanan dengan periode 1,3 detik. Tinggi gelombang tumbuh dari nol selama 0,45 detik saat on dan mereda kembali ke nol saat off, memakai satu path SVG yang sama. Klik di tengah transisi melanjutkan dari tinggi dan fase saat itu. Path memiliki panjang tetap dan ujung rounded tanpa clipping; animasinya memakai GSAP ticker yang sama dengan galeri. Status tersedia melalui label aksesibilitas dan tooltip.
- Suara adalah sintesis asli, bukan rekaman suara Apple. Untuk sound final, kamu bisa mengganti sintesis dengan sampel pendek di `sound.js`.
- Prev/Next, counter, dan navigasi melalui tombol panah telah dihapus. Seluruh ticks bergerak mengikuti fase scroll galeri. Tidak ada garis tengah tambahan: selama scroll bergerak, tick paling dekat tengah viewport menonjol dengan panjang 20 px. Tick di kedua sisinya mengecil menjadi 16, 12, 8, lalu 6 px, dengan transisi 0,22 detik. Setelah 0,22 detik tanpa gerakan, semua tick kembali sepanjang 6 px. Hover mendapat prioritas: tick yang ditunjuk dan tetangganya memakai pola menonjol yang sama hingga pointer keluar. Status aksesibilitas posisi galeri tetap diperbarui saat tampilan tick merata. Fade pada 12% ujung atas/bawah viewport ruler membuat garis memudar; tooltip berada di luar mask. Semua garis setebal 1 px. Setiap garis adalah tombol dengan jarak/area klik 8 px tinggi: penanda project menempatkan kartu di tengah; tujuh tick di antaranya menuju posisi pecahan antar-kartu. Sembilan grup tetap menjaga sambungan kedua arah; hanya grup tengah masuk urutan Tab/accessibility tree. Mobile memakai ruler lebih pendek. Metadata tetap berganti saat kartu mencapai tengah. Reduced motion mengikuti posisi di daftar statis, dengan tujuan dibatasi hingga pusat kartu terakhir.
- Tooltip hanya muncul saat item navigasi di-hover, di kiri item tersebut. Nama mengikuti project yang dituju oleh item (tick pecahan memakai nama project awal segmennya). Scroll biasa dan klik kartu tidak menampilkan tooltip. Wrapper mengikuti lebar teks dengan padding 14 px per sisi; perubahan nama dan lebar menggunakan transisi 0,28 detik. Teks memakai crossfade/perpindahan vertikal 4 px melalui dua layer tetap. Tooltip memudar selama 0,3 detik setelah pointer keluar; Home/reset menyembunyikannya langsung. Reduced motion menonaktifkan animasi. Clipping hanya pada viewport ticks sehingga tooltip tetap terlihat di sebelah kiri ruler. Label aksesibilitas tetap menjelaskan tujuan semua tick; tooltip native dihapus agar tidak tampil ganda.
- Margin luar kiri dan kanan memakai token `--edge` yang sama: 20–32 px pada desktop dan 16 px pada mobile. Email, CTA, serta sisi kanan navigasi mengikuti margin luar ini. Galeri memakai `--gallery-inset: 74px` pada desktop, agar sisi kanannya mendekati sisi kanan teks CTA. Mobile memakai tambahan 40 px dari margin luar; H1 dan metadata juga menyisakan kolom navigasi.
- `prefers-reduced-motion` menggunakan daftar statis tanpa loop/smoothing dan indikator sound aktif tanpa animasi.

## Flow development berikutnya

1. Ganti placeholder dengan tiga project asli dan optimalkan gambarnya.
2. Tentukan typography, spacing, dan styling final. Figma adalah storyboard kasar, bukan batas styling final.
3. Uji lagi loop, resize, mouse wheel, trackpad, dan touch dengan gambar asli.
4. Poles timing hero, pergantian metadata, dan karakter click sound.
5. Uji Safari/iPhone secara langsung, termasuk audio setelah klik, reduced motion, keyboard, dan zoom 200%.
6. Build production, isi metadata final, dan deploy folder `dist/`.

Referensi desain: https://www.figma.com/design/FkXglC7ztx7bIPEcHOGSHD/MCP-by-irpun-dev-team?node-id=554-793

## GitHub

Buat repository kosong untuk project ini, lalu jalankan dari folder project:

```bash
git init -b main
git add .
git commit -m "Set up Pug Vite portfolio"
```

Tambahkan remote menggunakan URL repository baru milikmu, lalu push `main`. Sertakan `package-lock.json`; `node_modules/` dan `dist/` sudah diabaikan.

Kerjakan satu interaksi per perubahan. Jalankan production build setelah mengubah konfigurasi/template. Untuk perubahan scroll atau audio, verifikasi melalui browser selain memeriksa build.

## Verifikasi starter

Pemeriksaan starter awal mencakup production build, development server, aset lokal, layout desktop 1440×911 dan mobile 390×844, loop kedua arah, jumlah kartu tetap, tombol Home, toggle audio, dan perubahan reduced motion saat halaman terbuka. Counter dan navigasi project yang diperiksa pada versi awal kini telah dihapus.

Revisi navbar sebelumnya diverifikasi melalui production build dan Safari desktop serta Responsive Design Mode hingga 320×568: kontrol navigasi lama tidak tampil, sound toggle berada di kiri CTA, serta pemilihan kartu tetap membuka galeri dan memperbarui metadata. Ikon empat kotak kini diganti dengan garis/gelombang.

Revisi garis/gelombang lolos production build dan pemeriksaan visual toggle on/off di Safari desktop.

Revisi H1 lolos production build dan pemeriksaan logika scroll pertama, posisi tetap pada loop dua arah, resize, serta kembali ke intro. Posisi sticky setelah resize dan tombol logo diperiksa di Safari desktop 1440×800 serta mobile 320×568. Gesture scroll dan timing transisi belum terverifikasi langsung pada revisi ini karena kontrol scroll browser mengembalikan error `noWindowsAvailable`.

Revisi durasi H1 1,1 detik, metadata bawah, dan dummy content lolos production build. Deskripsi/tags Project 02 muncul pada accessibility tree Safari desktop dan mobile 320×568. Pemeriksaan visual panel dan timing animasi masih terbatas: animasi tidak berjalan hingga selesai pada sesi browser otomatis ini.

Perbaikan sambungan intro/loop lolos production build dan 72 skenario pemeriksaan renderer desktop/mobile: lebar seluruh kartu serta posisi track konsisten di batas transisi, termasuk scroll yang melewati batas dan sisa gerakan kedua arah. Preview terbuka di Safari, tetapi verifikasi gesture langsung masih terhalang error kontrol scroll `noWindowsAvailable`.

Revisi email, ukuran kartu berbasis posisi, metadata saat mencapai tengah, dan ikon hover lolos production build. Pemeriksaan renderer pada delapan layout desktop/mobile mencakup pergantian metadata kedua arah dan sambungan loop, ukuran kartu yang masuk, kontinuitas intro/loop, serta posisi akhir pemilihan kartu. Safari desktop memperlihatkan navbar tanpa telepon dan ikon kartu tersembunyi sebelum hover. Timing hover dan gesture scroll belum diperiksa langsung.

Navigasi garis kanan diperiksa secara visual di Safari desktop dan Responsive Design Mode 320×568. Klik project kedua membawa kartu ke tengah, metadata berubah, dan garis kedua menjadi aktif. Jalur kanan terpisah dari galeri/metadata; mobile menampilkan tiga garis tanpa ticks dekoratif. Pemeriksaan logika pada delapan layout memverifikasi sinkronisasi indikator serta metadata, posisi akhir pemilihan kartu, dan pergantian kedua arah pada reduced motion. Production build lulus.

Revisi ruler bergerak memakai garis aktif tetap di tengah dan ticks yang mengikuti posisi pecahan antar-project. Pemeriksaan logika mencakup delapan layout, sambungan dua arah dengan 1/3/8 project, serta pergantian reduced motion kedua arah. Margin luar navbar dan ruler diperiksa di Safari desktop dan mobile 320×568. Ruler memakai `overflow: clip` agar fokus keyboard tidak menggulir area clipping. Production build lulus; timing gerakan dan klik ruler belum terverifikasi hingga selesai karena sesi otomatis membatasi animasi dan kontrol gesture mengembalikan `noWindowsAvailable`.

Revisi semua tick dapat diklik lolos production build dan 872 pemeriksaan target posisi, rute terdekat pada loop 1/3/8 project, serta metadata reduced motion dua arah. HTML hasil build memiliki tombol untuk semua tick. Safari desktop memperlihatkan garis 1 px, garis aktif 20 px, sisi kanan galeri sejajar mendekati teks CTA, dan klik tick 50% Continental–Hermo berhenti di antara kedua kartu dengan metadata Continental. Layout ruler dan ruang metadata juga diperiksa pada mobile 320×568.

Revisi jarak tick 8 px dan tooltip aktif lolos production build. Pemeriksaan logika mencakup timer idle selama gerakan berkelanjutan, fade-out yang dibatalkan saat scroll berlanjut, perubahan nama cepat, Home/reset, reduced motion, dan cakupan ruler dengan 1/3/8 project. Safari desktop memperlihatkan tooltip Statement lalu Continental, dan tooltip hilang setelah galeri berhenti. Tooltip Continental juga diperiksa di mobile 320×568 tanpa clipping; kedua layer nama dan seluruh tick tetap berjumlah konstan.

Revisi penanda pada tick asli dan tooltip khusus hover lolos production build serta 384 posisi ruler dengan 1/3/8 project: satu tick aktif, panjang tetangga simetris, dan sinkronisasi salinan loop. Pemeriksaan logika tooltip mencakup pergantian nama/lebar, posisi item, pointer keluar, dan reduced motion. Safari memperlihatkan tick aktif 20 px dan tetangga yang mengecil; tooltip tidak tampil setelah pemilihan project tanpa hover. Hover pointer langsung belum diperiksa karena kontrol koordinat browser mengembalikan `noWindowsAvailable`.

Revisi highlight hanya selama scroll/hover dan fade ujung lolos production build. Pemeriksaan sembilan rangkaian interaksi dengan 1/3/8 project mencakup scroll berkelanjutan, kembali ke garis 6 px saat idle, scroll yang dilanjutkan, prioritas hover, panjang tetangga, pointer keluar saat scroll, serta Home/reset. Safari memperlihatkan garis seragam tanpa highlight dan fade ujung atas/bawah. Timing scroll dan hover pointer langsung masih memiliki keterbatasan kontrol browser yang dicatat di atas.

Revisi Inspect lolos production build dan 12 skenario logika pada desktop 1440×800 serta mobile 390×844/320×568, dengan reduced motion on/off dan kartu asli/salinan loop. Pemeriksaan mencakup anchor kanan, pause/resume, penutupan saat ekspansi berlangsung, fokus tanpa scroll, resize, event native close yang tertunda, serta batas posisi cursor. Safari mengonfirmasi dialog Statement/Continental terbuka dan tombol tutup mengembalikan halaman. Tampilan/timing animasi dan hover langsung belum terverifikasi penuh karena screenshot/animasi Safari pada sesi otomatis ini tertunda dan kontrol pointer memiliki keterbatasan yang dicatat di atas.

Perbaikan transisi tutup Inspect lolos 12 skenario memakai timeline GSAP asli pada target geometri simulasi: margin simetris, latar putih opak, tujuan kembali yang tersimpan, reverse saat baru terbuka sebagian, resize saat tutup, fokus salinan loop, event native close tertunda, handoff gambar, serta reduced motion. Lima skenario renderer galeri memverifikasi fase/subpixel tetap setelah simulasi native focus bergeser satu siklus, pembekuan metadata, dan pembatalan momentum lama. Production build lulus. Timing visual melalui Safari otomatis tetap memiliki keterbatasan screenshot/animasi yang dicatat di atas.

iPhone dan gesture touch di perangkat asli belum diverifikasi; lakukan pemeriksaan tersebut sebelum publish. Karakter suara baru berupa prototype sintetis, dan gambar/URL portfolio masih perlu diisi.
