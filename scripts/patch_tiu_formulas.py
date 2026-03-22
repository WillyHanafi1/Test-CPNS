"""
patch_tiu_formulas.py
One-by-one reconstruction of corrupted TIU LaTeX formulas across Latihan 3,4,5,6.
Each fix is applied by matching the 'number' column and overwriting specific fields.
"""
import csv, sys, os

sys.stdout.reconfigure(encoding="utf-8")

# ──────────────────────────────────────────────────────────────────────────────
# PATCH DEFINITIONS
# Key: (label, question_number)
# Value: dict of field -> new_value  (only fields that need changing)
# ──────────────────────────────────────────────────────────────────────────────
PATCHES = {
    # ─── LATIHAN 3 ───────────────────────────────────────────────────────────
    # No.47: Rumus luas lingkaran (π) hilang di discussion
    ("L3", "47"): {
        "discussion": (
            "Geometri Dasar. "
            "P = $\\pi r^2 = \\frac{22}{7} \\times 7 \\times 7 = 154$ cm². "
            "Q: keliling persegi 44 cm → sisi = 11 cm. "
            "Luas Q = $11 \\times 11 = 121$ cm². "
            "Maka P > Q."
        ),
    },

    # ─── LATIHAN 4 ───────────────────────────────────────────────────────────
    # No.43: sqrt(169) = 13, lalu + 27 = 40. Jawaban B.
    ("L4", "43"): {
        "content": (
            "Nilai dari $\\sqrt{169}$ ditambah dengan $3^3$ adalah..."
        ),
        "discussion": (
            "Operasi Akar dan Pangkat. "
            "$\\sqrt{169} = 13$. "
            "Kemudian $3^3 = 27$. "
            "Maka $13 + 27 = 40$. Jawaban B."
        ),
    },

    # ─── LATIHAN 6 ───────────────────────────────────────────────────────────
    # No.41: frac(9999^3+1, 9999^2-9998). Jawaban C (= 10000).
    ("L6", "41"): {
        "content": (
            "Berapakah nilai dari "
            "$\\dfrac{9999^3 + 1}{9999^2 - 9998}$"
        ),
        "discussion": (
            "Aljabar Identitas: $a^3 + b^3 = (a+b)(a^2 - ab + b^2)$. "
            "Misalkan $a = 9999, b = 1$. "
            "Pembilang: $9999^3 + 1 = (9999+1)(9999^2 - 9999 + 1) = 10000(9999^2 - 9998)$. "
            "Penyebut: $9999^2 - 9998$. "
            "Hasil: $\\dfrac{10000(9999^2-9998)}{9999^2-9998} = 10000$. Jawaban C."
        ),
    },

    # No.42: x=sqrt(30+sqrt(30+...)), y=sqrt(20-sqrt(20-...)).
    # Dari disc: limit x=6, limit y=4, sum=10. Jawaban A.
    ("L6", "42"): {
        "content": (
            "Jika $x = \\sqrt{30 + \\sqrt{30 + \\sqrt{30 + \\cdots}}}$ "
            "dan $y = \\sqrt{20 - \\sqrt{20 - \\sqrt{20 - \\cdots}}}$, "
            "berapakah nilai $x + y$?"
        ),
        "discussion": (
            "Deret Akar Bersarang. "
            "Untuk x: $x = \\sqrt{30 + x}$ → $x^2 = 30 + x$ → $x^2 - x - 30 = 0$ → $x = 6$. "
            "Untuk y: $y = \\sqrt{20 - y}$ → $y^2 + y - 20 = 0$ → $y = 4$. "
            "Maka $x + y = 6 + 4 = 10$. Jawaban A."
        ),
    },

    # No.43: content OK, discussion punya '2024 $$ 4' = mod. Fix discussion.
    ("L6", "43"): {
        "content": (
            "Berapakah angka satuan dari $2^{2024} + 3^{2025} + 7^{2026}$?"
        ),
        "discussion": (
            "Aritmetika Modular (Angka Satuan). "
            "Pola satuan berpangkat berulang setiap 4 kali. "
            "$2024 \\mod 4 = 0$ → pola ke-4 dari 2 adalah 6. "
            "$2025 \\mod 4 = 1$ → pola ke-1 dari 3 adalah 3. "
            "$2026 \\mod 4 = 2$ → pola ke-2 dari 7 adalah 9. "
            "Total angka satuan $= 6 + 3 + 9 = 18$. Angka satuannya adalah 8. Jawaban D."
        ),
    },

    # No.44: x:y=4:5 dan y:z=5:6, cari (x²+y²)/(y²+z²) = 41/61. Jawaban A.
    ("L6", "44"): {
        "content": (
            "Jika $x : y = 4 : 5$ dan $y : z = 5 : 6$, "
            "berapakah nilai dari $\\dfrac{x^2 + y^2}{y^2 + z^2}$?"
        ),
        "discussion": (
            "Rasio Bertingkat. "
            "Diketahui $x:y = 4:5$ dan $y:z = 5:6$, maka $x:y:z = 4:5:6$. "
            "Misal $x=4k, y=5k, z=6k$. "
            "Substitusi: $\\dfrac{4^2+5^2}{5^2+6^2} = \\dfrac{16+25}{25+36} = \\dfrac{41}{61}$. "
            "Jawaban A."
        ),
    },

    # No.50: tinggi segitiga sama sisi = sqrt(3) cm. sisi=2, Luas≈1.73 < Luas persegi=2.25
    ("L6", "50"): {
        "content": (
            "Sebuah segitiga sama sisi memiliki luas X. "
            "Jika tinggi segitiga tersebut adalah $\\sqrt{3}$ cm, "
            "dan Y adalah luas persegi yang kelilingnya sama dengan keliling segitiga tersebut. "
            "Hubungan X dan Y adalah..."
        ),
        "discussion": (
            "Perbandingan Geometri. "
            "Tinggi segitiga sama sisi: $t = \\frac{s\\sqrt{3}}{2}$. "
            "Maka $\\frac{s\\sqrt{3}}{2} = \\sqrt{3}$, sehingga sisi $s = 2$ cm. "
            "Luas segitiga $X = \\frac{1}{4}\\sqrt{3}\\,s^2 = \\sqrt{3} \\approx 1.73$ cm². "
            "Keliling segitiga $= 3 \\times 2 = 6$ cm. "
            "Keliling persegi $= 6$ cm → sisi persegi $= 1.5$ cm. "
            "Luas persegi $Y = 1.5^2 = 2.25$ cm². "
            "Maka $X < Y$. Jawaban B."
        ),
    },

    # No.51: Wallis product A = 1/2 * 3/4 * 5/6 * ... * 99/100, B = 1/10.
    # A² < (1/2·2/3)(3/4·4/5)...(99/100·100/101) = 1/101, jadi A < 1/√101 < 1/10 = B
    ("L6", "51"): {
        "content": (
            "Diketahui $A = \\dfrac{1}{2} \\times \\dfrac{3}{4} \\times \\dfrac{5}{6} "
            "\\times \\cdots \\times \\dfrac{99}{100}$ "
            "dan $B = \\dfrac{1}{10}$. "
            "Berdasarkan ketaksamaan matematis, hubungan A dan B adalah..."
        ),
        "discussion": (
            "Ketaksamaan Wallis. "
            "$A^2 < \\left(\\frac{1}{2}\\cdot\\frac{2}{3}\\right)\\left(\\frac{3}{4}\\cdot\\frac{4}{5}\\right)\\cdots"
            "\\left(\\frac{99}{100}\\cdot\\frac{100}{101}\\right) = \\frac{1}{101}$. "
            "Karena $A^2 < \\frac{1}{101}$, maka $A < \\frac{1}{\\sqrt{101}} < \\frac{1}{10} = B$. "
            "Jadi $A < B$. Jawaban B."
        ),
    },
}

# ──────────────────────────────────────────────────────────────────────────────
FILE_MAP = {
    "L3": r"d:\ProjectAI\Test-CPNS\data\csv\Latihan3 - 80.csv",
    "L4": r"d:\ProjectAI\Test-CPNS\data\csv\Latihan4 - 70.csv",
    "L5": r"d:\ProjectAI\Test-CPNS\data\csv\Latihan5 - 90.csv",
    "L6": r"d:\ProjectAI\Test-CPNS\data\csv\Latihan6 - 100.csv",
}


def apply_patches():
    # Group patches by file
    file_patches: dict[str, dict[str, dict]] = {}
    for (label, num), fields in PATCHES.items():
        file_patches.setdefault(label, {})[num] = fields

    for label, patches in file_patches.items():
        path = FILE_MAP[label]
        print(f"\nPatching {label} ({os.path.basename(path)})...")

        with open(path, encoding="utf-8", newline="") as f:
            reader = csv.DictReader(f)
            fieldnames = reader.fieldnames
            rows = list(reader)

        fixed = 0
        for row in rows:
            num = row["number"]
            if num in patches:
                for field, new_val in patches[num].items():
                    old_val = row[field]
                    row[field] = new_val
                    if old_val != new_val:
                        print(f"  No.{num} [{field}]: patched")
                fixed += 1

        with open(path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(
                f, fieldnames=fieldnames,
                quoting=csv.QUOTE_ALL,
                lineterminator="\r\n",
            )
            writer.writeheader()
            writer.writerows(rows)

        print(f"  Done: {fixed} question(s) patched in {label}")

    print("\n=== All patches applied successfully ===")


if __name__ == "__main__":
    apply_patches()
