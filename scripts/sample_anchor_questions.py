"""
sample_anchor_questions.py — Just-In-Time Multi-Source Anchor Sampler for TOCPNS Authoring.

Mengambil HANYA 4–8 soal contoh padanan yang 100% tepat topik & sub-jenisnya
dari seluruh korpus 15 paket (Packet 1–15, 1.650 soal) agar konteks AI Agent
tetap sangat ringan, tidak salah ambil topik, dan mendapatkan variasi seimbang
antara Sumber A (Packet 1–3) dan Sumber B (Packet 4–15).

Penggunaan:
    python scripts/sample_anchor_questions.py --batch TWK-2 --count 5 --seed 1
    python scripts/sample_anchor_questions.py --batch TIU-1 --count 4 --seed 2
    python scripts/sample_anchor_questions.py --batch TIU-4 --profile standard --count 6
    python scripts/sample_anchor_questions.py --batch TIU-4 --profile hots --count 6
    python scripts/sample_anchor_questions.py --batch TKP-1 --count 5
    python scripts/sample_anchor_questions.py --list-batches
"""

from __future__ import annotations

import argparse
import json
import random
import re
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parent.parent


def _norm(text: str | None) -> str:
    return re.sub(r"\s+", " ", (text or "").lower()).strip()


def classify_tiu_subtype(q: dict[str, Any]) -> str:
    topic = q.get("topic") or q.get("sub_category") or ""
    stem = _norm(q.get("content"))
    disc = _norm(q.get("discussion"))
    opts = q.get("options") or []
    opt_str = " ".join(_norm(o.get("content")) for o in opts)
    full = stem + " " + disc
    sd_tbl = len((q.get("source_details") or {}).get("tables") or [])

    if topic == "Figural" or q.get("image") or q.get("image_url"):
        if any(k in full for k in ["matriks", "3x3", "3 x 3", "jaring-jaring", "kubus"]):
            return "Figural: Matriks 3x3"
        if any(k in full for k in ["tidak sama", "ketidaksamaan", "ketaksamaan", "gambar yang berbeda", "paling berbeda"]) and not any(k in stem for k in ["selanjutnya", "berikutnya", "tanda tanya"]):
            return "Figural: Ketidaksamaan"
        if any(k in full for k in ["analogi", "hubungan gambar", "pasangan gambar", "gambar pertama ke gambar kedua", "gambar 1 ke gambar 2"]) and not any(k in stem for k in ["selanjutnya", "berikutnya", "deret"]):
            return "Figural: Analogi"
        return "Figural: Serial"

    if "pernyataan (1) saja cukup" in opt_str or "pernyataan 1 saja cukup" in opt_str:
        return "Kecukupan Data"

    pq_pat = r"(x\s*[><=]\s*y|p\s*[><=]\s*q|a\s*[><=]\s*b|hubungan.*tidak dapat ditentukan|informasi.*tidak cukup|kuantitas\s+[pxa])"
    if topic == "Numerik" and (re.search(pq_pat, opt_str) or re.search(r"hubungan yang benar antara kuantitas|hubungan antara.*dan.*berdasarkan", stem)):
        return "Perbandingan Kuantitatif"

    if topic == "Numerik" and (
        "sama dengan" in opt_str
        or "estimasi terdekat" in stem
        or "paling mendekati hasil" in stem
        or "memiliki hasil sama dengan" in stem
        or "menghasilkan nilai sama" in stem
    ):
        return "Kesetaraan Operasi"

    if topic == "Numerik" and (
        any(k in stem for k in ["teka-teki angka", "tabel angka", "pola bilangan pada kedua kotak", "kolom a dan kolom b", "kolom x =", "kolom 1 | kolom 2"])
        or (sd_tbl >= 1 and any(k in stem for k in ["barisan bilangan", "pola bilangan", "pola yang tetap", "hubungan antara bilangan"]))
    ):
        return "Pola Bilangan Tabel"

    if topic == "Verbal":
        if any(k in stem for k in ["hubungan tersebut setara", "hubungan ini setara", "hubungan ini sama dengan", "hubungan pada kalimat", "hubungan objek pada kalimat", "kalimat yang memiliki hubungan", "setara dengan kalimat", "kalimat tersebut setara", "setara dengan..."]):
            return "Analogi Kalimat"
        opt_word_avg = sum(len((o.get("content") or "").split()) for o in opts) / max(len(opts), 1)
        if any(k in stem for k in ["analogi", "padanan", "hubungan kata"]) or (re.search(r"^[a-z\s]+\s*:\s*", stem) and len(stem.split()) <= 15) or (opt_word_avg <= 4.5 and sum(1 for o in opts if ":" in (o.get("content") or "")) >= 3):
            return "Analogi Kata"
        is_order_opt = any("→" in (o.get("content") or "") or (o.get("content") or "").count("-") >= 2 or (o.get("content") or "").count("–") >= 2 for o in opts)
        analitis_markers = ["duduk", "melingkar", "meja", "kursi", "bersebelahan", "di sebelah", "berhadapan", "urutan", "peringkat", "lebih tinggi", "lebih cepat", "jadwal", "senin", "selasa", "ruangan", "lantai", "halte", "rute", "jalur", "laboratorium", "paket", "beasiswa", "seleksi", "calon", "siapakah yang"]
        if is_order_opt or sd_tbl >= 1 or sum(1 for m in analitis_markers if m in stem) >= 2:
            return "Analitis"
        if any(k in stem for k in ["jika ", "bila ", "apabila ", "maka "]) or any(k in disc for k in ["modus ponens", "modus tollens", "kontraposisi", "implikasi"]):
            return "Silogisme Implikasi"
        return "Silogisme Kuantor"

    is_deret = (
        any(k in stem for k in ["deret", "barisan", "angka selanjutnya", "bilangan selanjutnya", "melengkapi deret", "pola bilangan"])
        or bool(re.search(r"(-?\d+\s*,\s*){4,}", stem))
    )
    if is_deret or any(k in disc for k in ["pola deret", "deret angka", "fibonacci", "larik", "barisan bilangan"]):
        return "Deret Angka"

    story_markers = ["harga", "diskon", "untung", "rugi", "bunga", "modal", "jual", "beli", "toko", "tarif", "pekerja", "karyawan", "mesin", "proyek", "kecepatan", "jarak", "km/jam", "berpapasan", "menyusul", "rata-rata", "nilai", "siswa", "usia", "umur", "tabel", "dealer", "pompa", "porsi", "teknisi", "penjahit"]
    if sum(1 for m in story_markers if m in stem) == 0 and (len(stem.split()) <= 24 or stem.count("$") >= 2 or any(k in stem for k in ["hasil dari", "nilai dari"])):
        return "Berhitung"
    return "Soal Cerita"


def classify_bi_subtype(q: dict[str, Any]) -> str:
    stem = _norm(q.get("content"))
    if any(k in stem for k in ["ide pokok", "gagasan utama", "gagasan pokok", "pikiran utama"]):
        return "BI: Ide Pokok"
    if any(k in stem for k in ["kalimat efektif", "tidak efektif", "keefektifan"]):
        return "BI: Kalimat Efektif"
    if any(k in stem for k in ["kalimat utama", "kalimat penjelas", "kalimat sumbang", "inti kalimat", "pola kalimat", "klausa"]):
        return "BI: Inti/Struktur Kalimat"
    if any(k in stem for k in ["ejaan", "puebi", "eyd", "tanda baca", "huruf kapital", "huruf miring", "koma", "penulisan"]):
        return "BI: EYD/Tanda Baca"
    if any(k in stem for k in ["kata baku", "tidak baku", "serapan", "imbuhan", "diksi", "konjungsi", "makna kata", "rumpang"]):
        return "BI: Kata Baku/Diksi"
    return "BI: Simpulan/Bacaan"


def load_corpus() -> list[dict[str, Any]]:
    corpus: list[dict[str, Any]] = []
    data_dir = REPO_ROOT / "data"
    for p_num in range(1, 30):
        pkt_dir = data_dir / f"Packet {p_num}"
        if not pkt_dir.exists():
            continue
        matches = sorted(pkt_dir.glob("outputs/**/*-bank-soal.json"))
        if not matches:
            continue
        raw = json.loads(matches[0].read_text(encoding="utf-8"))
        source_group = "A" if p_num <= 3 else ("B2" if p_num in (11, 12, 13) else "B1")
        for q in raw.get("questions", []):
            seg = (q.get("segment") or "").upper()
            topic = q.get("topic") or q.get("sub_category") or ""
            subtype = topic
            if seg == "TIU":
                subtype = classify_tiu_subtype(q)
            elif seg == "TWK" and topic == "Bahasa Indonesia":
                subtype = classify_bi_subtype(q)
            corpus.append(
                {
                    "packet": p_num,
                    "source_group": source_group,
                    "number": q["number"],
                    "segment": seg,
                    "topic": topic,
                    "subtype": subtype,
                    "content": q.get("content", ""),
                    "image": q.get("image") or q.get("image_url"),
                    "options": q.get("options", []),
                    "answer_key": q.get("answer_key"),
                    "discussion": q.get("discussion", ""),
                }
            )
    return corpus


# Batch definitions aligned 100% with BLUEPRINT.md (18 batches)
BATCH_SPECS: dict[str, dict[str, Any]] = {
    "TWK-1": {"segment": "TWK", "topic": "Nasionalisme", "desc": "TWK #1-6 Nasionalisme (6 soal)"},
    "TWK-2": {"segment": "TWK", "topic": "Integritas", "desc": "TWK #7-11 Integritas (5 soal)"},
    "TWK-3": {"segment": "TWK", "topic": "Bela Negara", "desc": "TWK #12-16 Bela Negara (5 soal)"},
    "TWK-4": {"segment": "TWK", "topic": "Pilar Negara", "desc": "TWK #17-24 Pilar Negara (8 soal)"},
    "TWK-5": {"segment": "TWK", "topic": "Bahasa Indonesia", "subtypes": ["BI: Ide Pokok", "BI: Inti/Struktur Kalimat", "BI: Simpulan/Bacaan", "BI: Kalimat Efektif", "BI: Kata Baku/Diksi", "BI: EYD/Tanda Baca"], "desc": "TWK #25-30 Bahasa Indonesia (6 soal, 6 sub-tipe)"},
    "TIU-1": {"segment": "TIU", "subtypes": ["Analogi Kata", "Analogi Kalimat"], "desc": "TIU #31-34 Analogi (2 Kata + 2 Kalimat)"},
    "TIU-2": {"segment": "TIU", "subtypes": ["Silogisme Kuantor", "Silogisme Implikasi"], "desc": "TIU #35-38 Silogisme (3 Kuantor + 1 Implikasi)"},
    "TIU-3": {"segment": "TIU", "subtypes": ["Analitis"], "desc": "TIU #39-42 Penalaran Analitis (4 soal)"},
    "TIU-4": {"segment": "TIU", "subtypes": ["Berhitung", "Deret Angka"], "hots_subtypes": ["Kesetaraan Operasi", "Pola Bilangan Tabel"], "desc": "TIU #43-48 Standar: 3 Berhitung + 3 Deret | HOTS: 3 Kesetaraan + 3 Pola Tabel"},
    "TIU-5": {"segment": "TIU", "subtypes": ["Perbandingan Kuantitatif"], "hots_subtypes": ["Kecukupan Data"], "desc": "TIU #49-52 Standar: 4 Perbandingan Kuantitatif | HOTS: 4-6 Kecukupan Data"},
    "TIU-6": {"segment": "TIU", "subtypes": ["Soal Cerita"], "hots_subtypes": ["Kecukupan Data", "Soal Cerita", "Berhitung"], "desc": "TIU #53-59 Soal Cerita & Tabel Data (7 soal)"},
    "TIU-7": {"segment": "TIU", "subtypes": ["Figural: Analogi", "Figural: Ketidaksamaan", "Figural: Serial", "Figural: Matriks 3x3"], "desc": "TIU #60-65 Figural (2 Analogi, 2 Ketidaksamaan, 1 Serial, 1 Matriks 3x3)"},
    "TKP-1": {"segment": "TKP", "topic": "Pelayanan Publik", "desc": "TKP #66-74 Pelayanan Publik (9 soal)"},
    "TKP-2": {"segment": "TKP", "topic": "Jejaring Kerja", "desc": "TKP #75-82 Jejaring Kerja (8 soal)"},
    "TKP-3": {"segment": "TKP", "topic": "Sosial Budaya", "desc": "TKP #83-89 Sosial Budaya (7 soal)"},
    "TKP-4": {"segment": "TKP", "topic": "Teknologi Informasi dan Komunikasi", "desc": "TKP #90-96 TIK (7 soal)"},
    "TKP-5": {"segment": "TKP", "topic": "Profesionalisme", "desc": "TKP #97-103 Profesionalisme (7 soal)"},
    "TKP-6": {"segment": "TKP", "topic": "Anti Radikalisme", "desc": "TKP #104-110 Anti Radikalisme (7 soal)"},
}


def pick_balanced(pool: list[dict[str, Any]], count: int, rng: random.Random, subtypes: list[str] | None = None) -> list[dict[str, Any]]:
    if not pool:
        return []
    selected: list[dict[str, Any]] = []
    used_keys: set[tuple[int, int]] = set()

    def take_from(candidates: list[dict[str, Any]], k: int, prefer_mix: bool = True) -> None:
        avail = [c for c in candidates if (c["packet"], c["number"]) not in used_keys]
        if not avail or k <= 0:
            return
        if prefer_mix:
            grp_a = [c for c in avail if c["source_group"] == "A"]
            grp_b = [c for c in avail if c["source_group"] != "A"]
            rng.shuffle(grp_a)
            rng.shuffle(grp_b)
            # Aim for ~40% Sumber A and ~60% Sumber B (when both exist)
            n_a = min(len(grp_a), max(1 if grp_a and k >= 2 else 0, round(k * 0.4)))
            n_b = min(len(grp_b), k - n_a)
            picks = grp_a[:n_a] + grp_b[:n_b]
            if len(picks) < k:
                rem = [c for c in avail if (c["packet"], c["number"]) not in {(x["packet"], x["number"]) for x in picks}]
                rng.shuffle(rem)
                picks.extend(rem[: k - len(picks)])
        else:
            rng.shuffle(avail)
            picks = avail[:k]
        for p in picks:
            used_keys.add((p["packet"], p["number"]))
            selected.append(p)

    if subtypes:
        # Ensure at least 1 example per requested subtype first
        per_sub = max(1, count // len(subtypes))
        for st in subtypes:
            sub_pool = [q for q in pool if q["subtype"] == st]
            take_from(sub_pool, min(per_sub, count - len(selected)))
        if len(selected) < count:
            take_from(pool, count - len(selected))
    else:
        take_from(pool, count)

    return selected[:count]


def format_compact(item: dict[str, Any], include_discussion: bool = True) -> dict[str, Any]:
    out = {
        "anchor_ref": f"Packet {item['packet']} #{item['number']} (Sumber {item['source_group']})",
        "segment": item["segment"],
        "topic": item["topic"],
        "subtype": item["subtype"],
        "content": item["content"],
        "options": [
            {"label": o.get("label"), "content": o.get("content"), "score": o.get("score")}
            for o in item["options"]
        ],
    }
    if item.get("image"):
        out["image"] = item["image"]
    if include_discussion:
        out["discussion"] = item["discussion"]
    return out


def main() -> int:
    parser = argparse.ArgumentParser(description="Sample verified multi-source anchor questions from Packet 1-15.")
    parser.add_argument("--batch", help="Kode batch di BLUEPRINT.md (mis. TWK-2, TIU-1, TIU-4, TKP-1).")
    parser.add_argument("--profile", choices=["standard", "hots"], default="standard", help="Profil TIU: standard (P1-10,14-15) atau hots (P11-13).")
    parser.add_argument("--segment", choices=["TWK", "TIU", "TKP"], help="Filter manual segmen (jika tidak pakai --batch).")
    parser.add_argument("--topic", help="Filter manual topic (mis. Integritas, Pelayanan Publik).")
    parser.add_argument("--subtype", help="Filter manual subtype (mis. 'Deret Angka', 'Analogi Kalimat', 'Kecukupan Data').")
    parser.add_argument("--count", type=int, default=5, help="Jumlah soal contoh yang diambil (default 5).")
    parser.add_argument("--seed", type=int, default=1, help="Seed acak deterministik (ubah per paket baru agar contoh bervariasi).")
    parser.add_argument("--no-discussion", action="store_true", help="Sembunyikan pembahasan agar output lebih ringkas.")
    parser.add_argument("--list-batches", action="store_true", help="Tampilkan daftar seluruh 18 batch.")
    args = parser.parse_args()

    if args.list_batches:
        for k, spec in BATCH_SPECS.items():
            print(f"{k:6s} | {spec['desc']}")
        return 0

    corpus = load_corpus()
    if not corpus:
        print("[ERROR] Tidak ada file *-bank-soal.json ditemukan di data/Packet */outputs/", file=sys.stderr)
        return 2

    rng = random.Random(args.seed)
    subtypes: list[str] | None = None

    if args.batch:
        code = args.batch.upper()
        if code not in BATCH_SPECS:
            print(f"[ERROR] Batch '{code}' tidak dikenal. Jalankan --list-batches.", file=sys.stderr)
            return 2
        spec = BATCH_SPECS[code]
        pool = [q for q in corpus if q["segment"] == spec["segment"]]
        if "topic" in spec:
            pool = [q for q in pool if q["topic"].lower() == spec["topic"].lower()]
        if args.profile == "hots" and "hots_subtypes" in spec:
            subtypes = spec["hots_subtypes"]
            pool = [q for q in pool if q["subtype"] in subtypes]
        elif "subtypes" in spec:
            subtypes = spec["subtypes"]
            pool = [q for q in pool if q["subtype"] in subtypes]
    else:
        pool = list(corpus)
        if args.segment:
            pool = [q for q in pool if q["segment"] == args.segment]
        if args.topic:
            pool = [q for q in pool if q["topic"].lower() == args.topic.lower()]
        if args.subtype:
            pool = [q for q in pool if args.subtype.lower() in q["subtype"].lower()]

    picks = pick_balanced(pool, args.count, rng, subtypes=subtypes)
    payload = {
        "batch": args.batch or "custom",
        "profile": args.profile,
        "corpus_total": len(corpus),
        "matching_pool": len(pool),
        "sampled_count": len(picks),
        "anchors": [format_compact(x, include_discussion=not args.no_discussion) for x in picks],
    }
    print(json.dumps(payload, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
