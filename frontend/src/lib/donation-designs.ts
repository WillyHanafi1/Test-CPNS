// These are leaderboard structures. All ten use the existing TOCPNS theme.
export const DONATION_DESIGNS = [
  {
    id: "podium",
    name: "Podium 3 Besar",
    structure: "Podium 2–1–3 + peringkat lanjutan",
    description:
      "Tiga donatur teratas berdiri di podium bertingkat. Peringkat pertama berada di tengah, disusul daftar ringkas di bawahnya.",
  },
  {
    id: "spotlight",
    name: "Sorotan Donatur",
    structure: "Kartu utama + dua penantang",
    description:
      "Peringkat satu mendapat area profil dan pesan yang besar. Peringkat dua dan tiga menempati kartu kecil, sisanya berupa daftar.",
  },
  {
    id: "bars",
    name: "Lintasan Dukungan",
    structure: "Grafik batang horizontal",
    description:
      "Setiap donatur memiliki lintasan dengan panjang sesuai nominalnya. Nama, posisi, dan nilai dibaca langsung pada lintasan.",
  },
  {
    id: "mosaic",
    name: "Mosaik Pendukung",
    structure: "Bento dengan ukuran kartu berbeda",
    description:
      "Peringkat satu menjadi kartu besar yang melintasi dua baris. Pendukung lainnya mengisi ubin kecil di sekelilingnya.",
  },
  {
    id: "overlay",
    name: "Papan Streamer",
    structure: "Pita peringkat + pesan setiap donatur",
    description:
      "Papan streamer dengan peringkat, nama, total donasi, dan pesan terakhir setiap donatur. Pendukung anonim tetap ikut peringkat dengan identitas disembunyikan.",
  },
  {
    id: "columns",
    name: "Dua Jalur Peringkat",
    structure: "Dua kolom daftar paralel",
    description:
      "Peringkat 1–5 di jalur kiri dan 6–10 di jalur kanan, memakai garis pemisah serta angka posisi sebagai penuntun.",
  },
  {
    id: "ladder",
    name: "Tangga Apresiasi",
    structure: "Anak tangga berjenjang",
    description:
      "Kartu peringkat membentuk tangga menurun dengan garis penghubung. Posisi peringkat terlihat dari bentuk keseluruhannya.",
  },
  {
    id: "orbit",
    name: "Lingkaran Pendukung",
    structure: "Juara di pusat + satelit peringkat",
    description:
      "Donatur utama berada di pusat lingkaran. Peringkat berikutnya mengelilinginya, lalu dilanjutkan daftar untuk peringkat lainnya.",
  },
  {
    id: "carousel",
    name: "Galeri Kartu",
    structure: "Kartu horizontal yang bisa digeser",
    description:
      "Satu kartu profil per donatur dengan pesan dan nominal. Geser atau gunakan tombol arah untuk menelusuri posisi berikutnya.",
  },
  {
    id: "accordion",
    name: "Peringkat Interaktif",
    structure: "Daftar buka-tutup dengan rincian",
    description:
      "Buka sebuah peringkat untuk melihat pesan, jumlah dukungan, dan totalnya. Peringkat lain tetap ringkas saat tidak dibuka.",
  },
] as const;
export type DonationDesignId = (typeof DONATION_DESIGNS)[number]["id"];
export function findDonationDesign(id: string | null | undefined) {
  return (
    DONATION_DESIGNS.find((design) => design.id === id) || DONATION_DESIGNS[4]
  );
}
