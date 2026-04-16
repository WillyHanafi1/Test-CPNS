"use client";

import React, { useState } from 'react';
import Script from 'next/script';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Heart, X, MessageSquare, ShieldCheck, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface DonationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_AMOUNTS = [15000, 25000, 50000, 100000];

export default function DonationModal({ isOpen, onClose }: DonationModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number>(25000);
  const [customAmount, setCustomAmount] = useState<string>('');
  const [message, setMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handlePresetSelect = (val: number) => {
    setAmount(val);
    setCustomAmount('');
  };

  const handleCustomChange = (val: string) => {
    setCustomAmount(val);
    const num = parseInt(val.replace(/\D/g, '')) || 0;
    setAmount(num);
  };

  const handlePay = async () => {
    if (amount < 1000) {
      toast.error('Minimal dukungan adalah Rp 1.000');
      return;
    }

    if (!user) {
      toast.error('Silakan login terlebih dahulu untuk memberikan dukungan');
      return;
    }

    setIsLoading(true);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

    try {
      const currentPath = window.location.pathname;
      const callbackUrl = `${window.location.origin}/payment/success?return_to=${encodeURIComponent(currentPath)}`;

      const response = await fetch(`${API_URL}/api/v1/transactions/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          message,
          is_anonymous: isAnonymous,
          callback_url: callbackUrl
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Gagal membuat transaksi');
      }

      const data = await response.json();
      
      // DOKU Checkout Overlay (Popup Mode)
      if (data.redirect_url) {
        if (typeof (window as any).loadJokulCheckout === 'function') {
          (window as any).loadJokulCheckout(data.redirect_url);
        } else {
          // Fallback to redirect if script not loaded
          window.location.href = data.redirect_url;
        }
      } else {
        toast.error('Gagal memuat link pembayaran');
      }
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
        <CardHeader className="relative border-b border-slate-800 pb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="absolute right-2 top-2 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-pink-500/20 rounded-lg">
              <Heart className="h-6 w-6 text-pink-500 fill-pink-500" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Dukung Platform Kami</CardTitle>
              <CardDescription className="text-slate-400">Feedback dan dukunganmu membantu kami terus berkembang.</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          {/* Pilihan Nominal */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">Pilih Nominal Dukungan</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((val) => (
                <Button
                  key={val}
                  variant={amount === val && !customAmount ? "default" : "outline"}
                  className={`border-slate-800 ${amount === val && !customAmount ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-950/50 text-slate-300 hover:bg-slate-800"}`}
                  onClick={() => handlePresetSelect(val)}
                >
                  {val / 1000}k
                </Button>
              ))}
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-medium">Rp</span>
              <Input
                placeholder="Nominal Kustom..."
                value={customAmount}
                onChange={(e) => handleCustomChange(e.target.value)}
                className="pl-10 bg-slate-950/50 border-slate-800 text-white focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Pesan Dukungan */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Pesan Dukungan (Opsional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tulis pesan penyemangat..."
              className="w-full min-h-[80px] p-3 rounded-md bg-slate-950/50 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
          </div>

          {/* Anonim Toggle */}
          <div className="flex items-center space-x-2 bg-indigo-500/5 p-3 rounded-lg border border-indigo-500/10">
            <input
              type="checkbox"
              id="anonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="anonymous" className="text-sm text-slate-300 flex items-center gap-1.5 cursor-pointer select-none">
              <ShieldCheck className="h-4 w-4 text-indigo-400" /> Sembunyikan Nama (Anonim)
            </label>
          </div>

          <Button 
            onClick={handlePay}
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg font-bold shadow-lg shadow-indigo-500/20"
          >
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Heart className="mr-2 h-5 w-5" />}
            Bayar Rp {amount.toLocaleString('id-ID')}
          </Button>

          <p className="text-[10px] text-center text-slate-500">
            Pembayaran akan diproses secara aman melalui DOKU.
          </p>
        </CardContent>
      </Card>

      {/* DOKU Checkout JS Library */}
      <Script 
        src={
          process.env.NEXT_PUBLIC_DOKU_ENVIRONMENT === 'production'
            ? "https://jokul.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js"
            : "https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js"
        }
        strategy="lazyOnload"
      />
    </div>
  );
}
