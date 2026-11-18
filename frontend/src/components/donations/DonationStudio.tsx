"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  CirclePlus,
  Monitor,
  Pin,
  RotateCcw,
  Smartphone,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import {
  DONATION_DESIGNS,
  findDonationDesign,
  type DonationDesignId,
} from "@/lib/donation-designs";
import {
  DEMO_SCENARIOS,
  demoOverview,
  type DemoDonation,
  type DemoScenarioId,
} from "@/lib/donation-demo";
import DonationCommunity from "./DonationCommunity";
import DonationForm from "./DonationForm";

const subscribeToHydration = () => () => {};

export default function DonationStudio() {
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const params = useSearchParams();
  const [format, setFormat] = useState<DonationDesignId>(
    findDonationDesign(params.get("format") || params.get("design")).id,
  );
  const [scenario, setScenario] = useState<DemoScenarioId>(
    DEMO_SCENARIOS.find((item) => item.id === params.get("scenario"))?.id ||
      "all",
  );
  const [compact, setCompact] = useState(params.get("view") === "home");
  const [mobile, setMobile] = useState(false);
  const [pinned, setPinned] = useState(true);
  const [extras, setExtras] = useState<DemoDonation[]>([]);
  const concept = findDonationDesign(format);
  const index = DONATION_DESIGNS.findIndex((item) => item.id === format);
  const data = demoOverview(scenario, extras);
  const activeScenario = DEMO_SCENARIOS.find((item) => item.id === scenario)!;
  function choose(next: {
    format?: DonationDesignId;
    scenario?: DemoScenarioId;
    compact?: boolean;
  }) {
    const nextFormat = next.format || format;
    const nextScenario = next.scenario || scenario;
    const nextCompact = next.compact ?? compact;
    setFormat(nextFormat);
    setScenario(nextScenario);
    setCompact(nextCompact);
    const url = new URL(window.location.href);
    url.searchParams.delete("design");
    url.searchParams.set("format", nextFormat);
    url.searchParams.set("scenario", nextScenario);
    url.searchParams.set("view", nextCompact ? "home" : "page");
    window.history.replaceState(null, "", url);
    if (next.scenario) setExtras([]);
  }
  function simulate() {
    const minutes = extras.length + 1;
    const date = new Date(
      Date.parse("2026-11-18T12:00:00+07:00") + minutes * 60000,
    ).toISOString();
    setExtras([
      ...extras,
      {
        id: `sim-${minutes}`,
        supporter_id: "preview-new",
        full_name: "Teman Baru",
        amount: 10000,
        message: `Pesan contoh baru ${minutes}: semoga kita semua dimudahkan. ✨`,
        paid_at: date,
        created_at: date,
        is_anonymous: false,
      },
    ]);
  }
  return (
    <AppShell>
      <div className="leaderboard-studio" inert={!hydrated}>
        <Link className="ls-back" href="/donasi">
          <ArrowLeft size={14} /> Kembali ke donasi
        </Link>
        <div className="ls-heading">
          <div>
            <span className="badge">Preview lokal · data contoh</span>
            <h1>10 format papan dukungan.</h1>
            <p className="muted">
              Tema TOCPNS tetap sama. Bandingkan susunan leaderboard, ditemani
              statistik dan pesan donasi seperti chat.
            </p>
          </div>
          <div className="ls-pagination">
            <button
              type="button"
              aria-label="Format sebelumnya"
              onClick={() =>
                choose({ format: DONATION_DESIGNS[(index + 9) % 10].id })
              }
            >
              <ChevronLeft size={18} />
            </button>
            <span>{String(index + 1).padStart(2, "0")} / 10</span>
            <button
              type="button"
              aria-label="Format berikutnya"
              onClick={() =>
                choose({ format: DONATION_DESIGNS[(index + 1) % 10].id })
              }
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
        <nav className="ls-formats" aria-label="10 format leaderboard">
          {DONATION_DESIGNS.map((item, i) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={format === item.id}
              onClick={() => choose({ format: item.id })}
            >
              <span>{String(i + 1).padStart(2, "0")}</span>
              <strong>{item.name}</strong>
              {format === item.id && <Check size={14} />}
            </button>
          ))}
        </nav>
        <div className="ls-concept">
          <div>
            <h2>{concept.name}</h2>
            <p>{concept.structure}</p>
          </div>
          <p>{concept.description}</p>
        </div>
        <div className="ls-toolbar">
          <div role="group" aria-label="Versi widget">
            <button
              type="button"
              className="filter"
              aria-pressed={!compact}
              onClick={() => choose({ compact: false })}
            >
              Halaman donasi
            </button>
            <button
              type="button"
              className="filter"
              aria-pressed={compact}
              onClick={() => choose({ compact: true })}
            >
              Bagian beranda
            </button>
          </div>
          <div
            className="ls-devices"
            role="group"
            aria-label="Ukuran pratinjau"
          >
            <button
              type="button"
              aria-pressed={!mobile}
              aria-label="Pratinjau desktop"
              onClick={() => setMobile(false)}
            >
              <Monitor size={17} />
            </button>
            <button
              type="button"
              aria-pressed={mobile}
              aria-label="Pratinjau ponsel"
              onClick={() => setMobile(true)}
            >
              <Smartphone size={17} />
            </button>
          </div>
          <label className="ls-pin-option">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(event) => setPinned(event.target.checked)}
            />
            <Pin size={13} /> Pin pesan teratas
          </label>
        </div>
        <div className="ls-scenario">
          <label htmlFor="leaderboard-scenario">Skenario data</label>
          <select
            id="leaderboard-scenario"
            className="input"
            disabled={!hydrated}
            value={scenario}
            onChange={(event) =>
              choose({ scenario: event.target.value as DemoScenarioId })
            }
          >
            {DEMO_SCENARIOS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="button button-small button-secondary"
            disabled={!["all", "november", "exceeded"].includes(scenario)}
            onClick={simulate}
          >
            <CirclePlus size={14} /> Simulasi pesan masuk
          </button>
        </div>
        <p className="ls-scenario-note">{activeScenario.note}</p>
        <div className={`ls-preview${mobile ? " ls-preview-mobile" : ""}`}>
          <DonationCommunity
            data={data}
            format={format}
            pinned={pinned}
            compact={compact}
            demo
          />
        </div>
        <div className="ls-bottom">
          <p>
            Konsep 05 sudah diterapkan di beranda dan halaman donasi. Pilihan di
            studio hanya untuk perbandingan.
          </p>
          <Link href="/donasi" className="button button-small">
            Buka halaman donasi <ArrowRight size={15} />
          </Link>
          <button
            type="button"
            className="ls-reset"
            onClick={() => {
              setExtras([]);
              choose({ format: "overlay", scenario: "all", compact: false });
              setMobile(false);
            }}
          >
            <RotateCcw size={13} /> Reset
          </button>
        </div>
        <details className="ls-test-form">
          <summary>Coba formulir donasi tanpa pembayaran</summary>
          <div id="donation-form" className="panel">
            <DonationForm demo />
          </div>
        </details>
        <details className="ls-notes">
          <summary>Konsep pesan dan referensi</summary>
          <p>
            Pesan memakai field donasi yang sudah ada pada proyek, termasuk
            konsep Aktivitas Live di WallOfFame.tsx lama. Di sini pesan
            berurutan dari lama ke baru, dikelompokkan per tanggal WIB. Pesan
            pendukung teratas ditampilkan sekali sebagai sorotan kecil, dapat
            dibuka atau disembunyikan. Pin mengikuti periode dan hanya muncul
            jika pendukung teratas memiliki pesan.
          </p>
          <p>
            Referensi pola:{" "}
            <a
              href="https://saweria.co/docs/custom-overlays"
              target="_blank"
              rel="noreferrer"
            >
              Saweria
            </a>
            ,{" "}
            <a
              href="https://chatango.com/help"
              target="_blank"
              rel="noreferrer"
            >
              Chatango
            </a>
            , dan{" "}
            <a
              href="https://support.google.com/youtube/answer/2524549?hl=en"
              target="_blank"
              rel="noreferrer"
            >
              pesan pin pada live chat
            </a>
            . Pilihan otomatis menyorot donatur teratas merupakan rancangan
            TOCPNS untuk dibandingkan, bukan aturan baku platform tersebut. Data
            di preview fiktif.
          </p>
        </details>
      </div>
    </AppShell>
  );
}
