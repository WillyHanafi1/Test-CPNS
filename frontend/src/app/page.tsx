"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, Shield, Zap, Target, Users, Heart } from 'lucide-react';
import WallOfFame from '@/components/WallOfFame';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Abstract Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">CAT CPNS <span className="text-indigo-500">PRO</span></span>
          </div>
          <div className="hidden md:flex items-center space-x-8 text-sm font-medium text-slate-400">
            <Link href="/catalog" className="hover:text-white transition-colors">Katalog Paket</Link>
            <Link href="#features" className="hover:text-white transition-colors">Fitur Utama</Link>
            <Link href="#price" className="hover:text-white transition-colors">Harga</Link>
            <Link href="/support" className="text-pink-400 hover:text-pink-300 transition-colors flex items-center gap-1">
              <Heart className="w-3 h-3 fill-pink-500" /> Dukung Kami
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost" className="text-slate-300 hover:text-white">Masuk</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25">Daftar Sekarang</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full py-1.5 px-4 mb-8">
            <Badge variant="secondary" className="bg-indigo-500 text-[10px] uppercase font-bold py-0 h-5">Baru</Badge>
            <span className="text-xs font-medium text-indigo-400">Update Soal SKD & SKB 2026 Terbaru</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            Lolos CPNS dengan <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">Simulasi Paling Akurat.</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
            Platform Computer Assisted Test (CAT) premium dengan arsitektur enterprise. Rasakan pengalaman ujian seperti aslinya dengan sistem anti-lag dan database soal terupdate.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register">
              <Button className="h-14 px-10 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 w-full sm:w-auto">
                Mulai Simulasi Gratis
              </Button>
            </Link>
            <Link href="/catalog">
              <Button variant="outline" className="h-14 px-10 text-lg font-bold border-slate-800 hover:bg-slate-900 w-full sm:w-auto">
                Lihat Katalog Soal
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-slate-900/20 relative">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Kenapa Memilih CAT CPNS PRO?</h2>
            <p className="text-slate-400">Teknologi modern untuk persiapan yang lebih maksimal.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-amber-400" />}
              title="Real-time Performance"
              description="Sistem anti-lag dengan autosave berbasis Redis. Jawaban tersimpan detik itu juga meski koneksi putus."
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6 text-emerald-400" />}
              title="Validasi Server-side"
              description="Timer aman di sisi server. Tidak ada kecurangan waktu, hasil simulasi Anda benar-benar valid."
            />
            <FeatureCard 
              icon={<Target className="w-6 h-6 text-indigo-400" />}
              title="Analitik Mendalam"
              description="Laporan skor instan per kategori (TWK, TIU, TKP) lengkap dengan statistik kelulusan passing grade."
            />
          </div>
        </div>
      </section>

      {/* Community Support / Wall of Fame */}
      <section className="py-24 relative overflow-hidden bg-slate-900/10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-black mb-4 tracking-tight">Dukungan Dari <span className="text-indigo-500">Komunitas</span></h2>
            <p className="text-slate-400 max-w-lg mx-auto italic mb-10">Platform ini terus hidup dan berkembang berkat dukungan tulus dari para peserta.</p>
            <WallOfFame />
            <div className="mt-12 text-center">
              <Link href="/support">
                <Button variant="outline" className="border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/10 rounded-xl">
                  Lihat Supporter Hub Selengkapnya
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 border-t border-slate-900">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <StatBox count="50.000+" label="Peserta Terdaftar" />
          <StatBox count="1.000+" label="Paket Soal" />
          <StatBox count="98%" label="Tingkat Kepuasan" />
          <StatBox count="24/7" label="Dukungan Sistem" />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-900 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            <span className="font-bold">CAT CPNS PRO</span>
          </div>
          <p className="text-slate-500 text-sm">
            © 2026 CAT CPNS Simulation Platform. Build with Passion for Your Future Career.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/30 transition-all duration-300 group">
      <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-400 leading-relaxed text-sm">{description}</p>
    </div>
  );
}

function StatBox({ count, label }: { count: string, label: string }) {
  return (
    <div>
      <div className="text-3xl md:text-4xl font-extrabold text-white mb-1">{count}</div>
      <div className="text-slate-500 text-sm uppercase tracking-wider font-semibold">{label}</div>
    </div>
  );
}

function Badge({ children, variant, className }: { children: React.ReactNode, variant?: string, className?: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {children}
    </span>
  );
}
