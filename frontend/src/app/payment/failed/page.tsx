"use client";

import React, { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCcw, Home, Headset } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import gsap from 'gsap';

export default function PaymentFailedPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(cardRef.current, {
        x: -20,
        opacity: 0,
        duration: 0.8,
        ease: "power3.out"
      });

      gsap.from(iconRef.current, {
        scale: 0.5,
        opacity: 0,
        duration: 0.5,
        delay: 0.3,
        ease: "back.out(2)"
      });

      gsap.from(".action-btn", {
        opacity: 0,
        y: 10,
        stagger: 0.1,
        delay: 0.6
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4"
    >
      <div ref={cardRef} className="w-full max-w-md z-10">
        <Card className="bg-slate-900/50 border-red-500/20 backdrop-blur-xl shadow-2xl">
          <CardContent className="pt-12 pb-10 px-8 text-center">
            <div ref={iconRef} className="flex justify-center mb-6">
              <div className="p-4 bg-red-500/20 rounded-full ring-8 ring-red-500/10">
                <AlertCircle className="h-16 w-16 text-red-500" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Pembayaran Gagal</h1>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Maaf, transaksi tidak dapat diproses. Hal ini bisa terjadi karena saldo tidak mencukupi atau kendala teknis pada sistem pembayaran.
            </p>

            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/')}
                className="action-btn w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-6 transition-all duration-300"
              >
                <RefreshCcw className="mr-2 h-5 w-5" /> Coba Lagi Sekarang
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                   variant="outline"
                   onClick={() => router.push('/dashboard')}
                   className="action-btn border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800"
                >
                  <Home className="mr-2 h-4 w-4" /> Dashboard
                </Button>
                <Button 
                   variant="outline"
                   className="action-btn border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800"
                >
                  <Headset className="mr-2 h-4 w-4" /> Bantuan
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
