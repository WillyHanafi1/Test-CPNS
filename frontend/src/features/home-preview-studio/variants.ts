export interface PreviewVariant {
  number: number;
  id: string;
  name: string;
  styleRef: string;
  description: string;
}

export const PREVIEW_VARIANTS: PreviewVariant[] = [
  {
    number: 1,
    id: "browser-window",
    name: "Jendela Browser",
    styleRef: "Gaya Stripe / GitHub",
    description:
      "Bingkai jendela browser bersih dengan tiga titik kontrol, bilah alamat simulasi tocpns.my.id, dan bayangan halus.",
  },
  {
    number: 2,
    id: "double-bezel",
    name: "Bingkai Ganda Mengambang",
    styleRef: "Gaya Linear / Raycast",
    description:
      "Panggung luar berlatar lembut dengan garis luar tipis dan ruang bernapas yang memisahkan pratinjau dari halaman beranda.",
  },
  {
    number: 3,
    id: "blueprint-dashed",
    name: "Garis Putus-Putus Arsitektural",
    styleRef: "Gaya Vercel / Tailwind",
    description:
      "Container garis tipis putus-putus dengan tanda sudut (+) dan label mengambang di tepi atas agar langsung terbaca sebagai contoh.",
  },
  {
    number: 4,
    id: "dot-grid-stage",
    name: "Kanvas Titik Halus",
    styleRef: "Gaya Figma / Framer",
    description:
      "Panggung berbingkai tipis dengan pola titik super halus di belakang jendela ujian, terasa modern dan interaktif.",
  },
  {
    number: 5,
    id: "device-bezel",
    name: "Bingkai Layar Perangkat",
    styleRef: "Gaya Apple / Notion",
    description:
      "Bingkai layar tablet/laptop tipis dengan sudut membulat lembut dan indikator bar bawah agar langsung terbayang saat dipakai belajar.",
  },
  {
    number: 6,
    id: "editorial-split",
    name: "Bingkai 2 Kolom Editorial",
    styleRef: "Gaya Notion / Readwise",
    description:
      "Satu kotak berbingkai garis tipis memisahkan penjelasan + tombol mode di kiri dan jendela soal ringkas di kanan.",
  },
  {
    number: 7,
    id: "tabbed-app-bar",
    name: "Tab Terintegrasi di Bingkai",
    styleRef: "Gaya GitHub / Arc",
    description:
      "Tab Mode Ujian dan Mode Pembahasan menyatu langsung ke bingkai atas jendela seperti tampilan tab kode di GitHub.",
  },
  {
    number: 8,
    id: "accent-halo",
    name: "Bingkai Garis Aksen Lembut",
    styleRef: "Gaya Clerk / Supabase",
    description:
      "Bingkai tipis bernuansa warna aksen lembut dengan pita keterangan kecil di atas jendela agar batas pratinjau sangat jelas.",
  },
  {
    number: 9,
    id: "hairline-sandbox",
    name: "Garis Tipis + Footer Sandbox",
    styleRef: "Gaya Superhuman / Things",
    description:
      "Bingkai hairline ultra-bersih dengan pita atas tipis dan bilah status bawah bahwa ini mode contoh lokal sebelum mencoba 110 soal.",
  },
  {
    number: 10,
    id: "compact-spotlight",
    name: "Spotlight Terpusat + Strip Soal",
    styleRef: "Gaya Resend / Cal.com",
    description:
      "Pratinjau dipusatkan lebih ringkas di dalam panggung bergaris tipis dengan tombol cepat 01 TWK · 02 TIU · 03 TKP di tepi atas.",
  },
];
