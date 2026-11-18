"use client";

import React, { useState } from "react";
import { rememberPayment } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Modal from "@/components/Modal";
import { Heart, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AMOUNTS = [15000, 25000, 50000, 100000];

export default function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(25000);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [message, setMessage] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handlePresetSelect = (val: number) => {
    setAmount(val);
    setCustomAmount("");
  };

  const handleCustomChange = (val: string) => {
    setCustomAmount(val);
    const num = parseInt(val.replace(/\D/g, "")) || 0;
    setAmount(num);
  };

  const handlePay = async () => {
    if (amount < 1000) {
      toast.error("Minimal dukungan adalah Rp 1.000");
      return;
    }

    if (!user) {
      toast.error("Silakan login terlebih dahulu untuk memberikan dukungan");
      return;
    }

    setIsLoading(true);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

    try {
      const currentPath = window.location.pathname;
      const callbackUrl = `${window.location.origin}/payment/success?return_to=${encodeURIComponent(currentPath)}`;

      const response = await fetch(`${API_URL}/api/v1/transactions/donate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          message,
          is_anonymous: isAnonymous,
          callback_url: callbackUrl,
        }),
        credentials: "include",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Gagal membuat transaksi");
      }

      const data = await response.json();

      if (!data.redirect_url)
        throw new Error("Link pembayaran belum tersedia. Silakan coba lagi.");
      rememberPayment(data.order_id, user.id);
      window.location.assign(data.redirect_url);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Terjadi kesalahan sistem",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open={isOpen} title="Dukung TOCPNS" onClose={onClose}>
      <p className="muted">
        Dukungan bersifat opsional dan membantu biaya operasional platform.
      </p>
      <fieldset className="stack" style={{ gap: 12 }}>
        <legend className="field" style={{ marginBottom: 12 }}>
          Pilih nominal dukungan
        </legend>
        <div className="inline">
          {PRESET_AMOUNTS.map((value) => (
            <button
              type="button"
              className="filter"
              key={value}
              aria-pressed={amount === value && !customAmount}
              onClick={() => handlePresetSelect(value)}
            >
              Rp {value.toLocaleString("id-ID")}
            </button>
          ))}
        </div>
        <label className="field">
          Nominal lain (rupiah)
          <input
            className="input"
            inputMode="numeric"
            value={customAmount}
            onChange={(event) => handleCustomChange(event.target.value)}
            placeholder="Minimal 1.000"
          />
        </label>
      </fieldset>
      <label className="field">
        Pesan (opsional)
        <textarea
          className="input"
          rows={3}
          maxLength={150}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tulis pesan singkat…"
        />
      </label>
      <label className="inline" style={{ fontSize: 14 }}>
        <input
          type="checkbox"
          checked={isAnonymous}
          onChange={(event) => setIsAnonymous(event.target.checked)}
        />{" "}
        Sembunyikan nama saya
      </label>
      <button className="button" onClick={handlePay} disabled={isLoading}>
        {isLoading ? (
          <Loader2 size={17} className="animate-spin" />
        ) : (
          <Heart size={17} />
        )}{" "}
        {isLoading
          ? "Menyiapkan pembayaran…"
          : `Lanjutkan · Rp ${amount.toLocaleString("id-ID")}`}
      </button>
      <p className="muted" style={{ fontSize: 12 }}>
        Pembayaran dilanjutkan melalui DOKU.
      </p>
    </Modal>
  );
}
