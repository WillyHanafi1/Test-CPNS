"use client";

import React, { useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Home, History, Download, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import gsap from 'gsap';

function SuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('return_to');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Background entry
      gsap.from(containerRef.current, {
        opacity: 0,
        duration: 0.8,
        ease: "power2.out"
      });

      // Card entry
      gsap.from(cardRef.current, {
        y: 40,
        opacity: 0,
        duration: 0.8,
        delay: 0.2,
        ease: "back.out(1.7)"
      });

      // Icon pop
      gsap.from(iconRef.current, {
        scale: 0,
        rotation: -45,
        duration: 0.6,
        delay: 0.5,
        ease: "back.out(2)"
      });

      // Stagger button entry
      gsap.from(".action-btn", {
        y: 20,
        opacity: 0,
        duration: 0.5,
        stagger: 0.1,
        delay: 0.8,
        ease: "power2.out"
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 selection:bg-indigo-500/30"
    >
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/10 blur-[120px] rounded-full" />
      </div>

      <div ref={cardRef} className="w-full max-w-md z-10">
        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-xl shadow-2xl overflow-hidden">
          <CardContent className="pt-12 pb-10 px-8 text-center">
            <div ref={iconRef} className="flex justify-center mb-6">
              <div className="p-4 bg-emerald-500/20 rounded-full ring-8 ring-emerald-500/10">
                <CheckCircle2 className="h-16 w-16 text-emerald-500" />
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Pembayaran Berhasil!</h1>
            <p className="text-slate-400 mb-8 leading-relaxed">
              Terima kasih atas dukunganmu. Kontribusimu sangat berarti bagi pengembangan platform simulasi CPNS ini.
            </p>

            <div className="space-y-3">
              <Button 
                onClick={() => router.push(returnTo || '/dashboard')}
                className="action-btn w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-6 transition-all duration-300"
              >
                {returnTo ? (
                  <>
                    <ArrowLeft className="mr-2 h-5 w-5" /> Kembali ke Halaman Sebelumnya
                  </>
                ) : (
                  <>
                    <Home className="mr-2 h-5 w-5" /> Kembali ke Dashboard
                  </>
                )}
              </Button>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                   variant="outline"
                   onClick={() => router.push('/history')}
                   className="action-btn border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <History className="mr-2 h-4 w-4" /> Riwayat
                </Button>
                <Button 
                   variant="outline"
                   className="action-btn border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <Download className="mr-2 h-4 w-4" /> Invoice
                </Button>
              </div>
            </div>
          </CardContent>
          <div className="bg-indigo-500/5 border-t border-slate-800/50 py-4 px-8">
            <p className="text-[11px] text-slate-500 text-center uppercase tracking-widest font-medium">
              Transaksi ID akan diperbarui otomatis di riwayat anda
            </p>
          </div>
        </Card>
      </div>

      <p className="mt-8 text-slate-600 text-sm">
        Punya kendala? <span className="text-indigo-400 hover:underline cursor-pointer">Hubungi Support</span>
      </p>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
