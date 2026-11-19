export const segments = ["TWK", "TIU", "TKP"] as const;
export type Segment = (typeof segments)[number];
export type Mode = "ujian" | "hasil" | "pembahasan";
export type Option = { label: string; text: string | null; image?: string | null; score: number };
export type Question = {
  number: number;
  segment: Segment;
  topic?: string | null;
  text: string;
  image?: string | null;
  explanation?: string | null;
  options: Option[];
};
export type ExamPackage = { title: string; questions: Question[]; demo?: boolean };
export type Answers = Record<number, string>;

type Design = {
  id: string;
  name: string;
  caption: string;
  navigator: "right" | "top" | "left" | "drawer" | "bottom";
  options: "vertical" | "rows" | "three-left" | "three-right" | "figural";
  review: "below" | "aside";
  style: "classic" | "compact" | "sand" | "navy" | "focus" | "sage" | "rail" | "split" | "figural" | "reader";
};

export const designs: Design[] = [
  { id: "panel-kanan", name: "Panel kanan", caption: "Daftar A–E vertikal dan peta soal tetap terlihat di kanan.", navigator: "right", options: "vertical", review: "below", style: "classic" },
  { id: "grid-baris", name: "Grid per baris", caption: "A–B, C–D, lalu E. Dua kolom untuk membandingkan opsi singkat.", navigator: "right", options: "rows", review: "below", style: "compact" },
  { id: "tiga-kiri", name: "3 kiri · 2 kanan", caption: "A–C di kiri, D–E di kanan. Navigator memakai ruang di kiri.", navigator: "left", options: "three-left", review: "below", style: "sand" },
  { id: "tiga-kanan", name: "2 kiri · 3 kanan", caption: "A–B di kiri, C–E di kanan. Peta soal melebar di atas.", navigator: "top", options: "three-right", review: "below", style: "navy" },
  { id: "mode-fokus", name: "Mode fokus", caption: "Satu kolom terpusat. Peta soal dibuka dari tombol Daftar soal.", navigator: "drawer", options: "vertical", review: "below", style: "focus" },
  { id: "catatan-samping", name: "Catatan samping", caption: "Ujian dengan peta di kanan. Saat pembahasan, penjelasan berada di samping jawaban.", navigator: "right", options: "vertical", review: "aside", style: "sage" },
  { id: "navigator-bawah", name: "Navigator bawah", caption: "Daftar nomor bergeser horizontal di bawah area soal.", navigator: "bottom", options: "vertical", review: "below", style: "rail" },
  { id: "per-segmen", name: "Per segmen", caption: "Pilih TWK, TIU, atau TKP di kiri. Layar lebar memisahkan soal dan opsi.", navigator: "left", options: "vertical", review: "below", style: "split" },
  { id: "kartu-figural", name: "Kartu figural", caption: "Diagram lebih besar dengan grid untuk opsi bergambar atau label pendek.", navigator: "right", options: "figural", review: "below", style: "figural" },
  { id: "mode-baca", name: "Mode baca", caption: "Geist untuk kontrol dan Georgia untuk isi. Teks lebih besar dengan kolom baca sempit.", navigator: "drawer", options: "vertical", review: "below", style: "reader" },
];

export const segmentNames: Record<Segment, string> = {
  TWK: "Wawasan Kebangsaan",
  TIU: "Intelegensia Umum",
  TKP: "Karakteristik Pribadi",
};

const examples = [
  { segment: "TWK", topic: "Pancasila", text: "Musyawarah warga menghasilkan kebijakan yang mengakomodasi kebutuhan kelompok minoritas. Sikap apa yang sebaiknya ditunjukkan panitia?", choices: ["Mengabaikan hasil musyawarah", "Mengutamakan kelompok terbesar", "Menerapkan keputusan bersama dengan adil", "Menunda penerapan tanpa alasan", "Menyerahkan seluruh keputusan kepada panitia"], scores: [0, 0, 5, 0, 0], explanation: "Keputusan yang telah disepakati perlu dijalankan dengan tanggung jawab dan perlakuan yang adil terhadap seluruh warga." },
  { segment: "TIU", topic: "Aljabar", text: "Bila $x = 4$, berapakah nilai dari ekspresi berikut?\n\n$$\n\\frac{x^2 - 4}{\\sqrt{x} + 1}\n$$", choices: ["$2$", "$3$", "$4$", "$5$", "$6$"], scores: [0, 0, 5, 0, 0], explanation: "Substitusikan $x = 4$. Pembilang menjadi $16 - 4 = 12$ dan penyebut menjadi $2 + 1 = 3$.\n\n$$\n\\frac{12}{3} = 4\n$$" },
  { segment: "TKP", topic: "Pelayanan publik", text: "Seorang warga datang menjelang loket ditutup dan meminta bantuan mengisi formulir. Ia belum memahami istilah pada formulir dan perlu menyelesaikan pengajuan hari itu. Apa yang Anda lakukan?", choices: ["Meminta warga kembali keesokan hari tanpa penjelasan.", "Memberikan formulir kosong dan mengarahkan warga untuk bertanya kepada pengunjung lain.", "Menjelaskan langkah pengisian dan mengarahkan ke petugas yang masih menangani pengajuan.", "Mendampingi warga sesuai prosedur, memastikan ia memahami informasi, dan menuntaskan pengajuan jika waktu pelayanan memungkinkan.", "Menjelaskan istilah yang sulit dan memberikan panduan tertulis untuk dibawa pulang."], scores: [1, 2, 4, 5, 3], explanation: "Pilihan dengan bobot tertinggi menggabungkan inisiatif, komunikasi yang mudah dipahami, serta kepatuhan terhadap prosedur pelayanan. Pilihan lain tetap memperoleh bobot sesuai kualitas responsnya." },
] as const;

export const fallbackPackage: ExamPackage = {
  title: "Paket contoh Studio CAT",
  demo: true,
  questions: [30, 35, 45].flatMap((count, group) => {
    const sample = examples[group];
    const offset = [0, 30, 65][group];
    return Array.from({ length: count }, (_, index) => ({
      number: offset + index + 1,
      segment: sample.segment,
      topic: sample.topic,
      text: sample.text,
      explanation: sample.explanation,
      options: sample.choices.map((text, option) => ({ label: "ABCDE"[option], text, score: sample.scores[option] })),
    }));
  }),
};

export function exampleAnswers(questions: Question[]): Answers {
  return Object.fromEntries(questions.filter(({ number }) => number <= 44 && number % 4 !== 0).map((question) => {
    const max = Math.max(...question.options.map((option) => option.score));
    const best = question.options.find((option) => option.score === max);
    const other = question.options.find((option) => option.score < max);
    return [question.number, (question.number % 3 === 0 ? other ?? best : best)?.label ?? "A"];
  }));
}

export function outcome(question: Question, answers: Answers) {
  const selection = question.options.find((option) => option.label === answers[question.number]);
  const max = Math.max(...question.options.map((option) => option.score));
  return { selection, max, score: selection?.score ?? 0, best: selection?.score === max };
}
