"use client";

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BookOpen, CheckCircle2, Shield, Zap, Target, Users, User, Heart, ArrowRight, Star, HelpCircle } from 'lucide-react';
import WallOfFame from '@/components/WallOfFame';
import Navbar from '@/components/Navbar';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white overflow-hidden">
      {/* Abstract Background Orbs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      <Navbar />

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/20 rounded-full py-1.5 px-4 mb-8 translate-y-0 opacity-100 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Badge className="bg-indigo-500 text-white text-[10px] uppercase font-bold px-2 rounded h-5">Baru</Badge>
            <span className="text-xs font-medium text-indigo-400">Update Soal SKD & SKB 2026 Terbaru</span>
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 leading-[1.05] animate-in fade-in slide-in-from-bottom-6 duration-1000">
            Lolos CPNS dengan <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent">Simulasi Paling Akurat.</span>
          </h1>
          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
            Platform Computer Assisted Test (CAT) premium dengan arsitektur enterprise. Rasakan pengalaman ujian seperti aslinya dengan sistem anti-lag dan database soal terupdate.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <Link href="/register" className="w-full sm:w-auto">
              <Button className="h-14 px-10 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/30 w-full rounded-2xl">
                Mulai Simulasi Gratis
              </Button>
            </Link>
            <Link href="/catalog" className="w-full sm:w-auto">
              <Button variant="outline" className="h-14 px-10 text-lg font-bold border-slate-800 hover:bg-slate-900 w-full rounded-2xl group">
                Lihat Katalog Soal
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-32 relative">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <HelpCircle className="w-12 h-12 text-indigo-500 mx-auto opacity-50 mb-4" />
            <h2 className="text-4xl font-black tracking-tight">Pertanyaan Umum.</h2>
          </div>
          <div className="space-y-6">
            <FAQItem question="Bagaimana cara aktivasi akun PRO?" answer="Cukup daftar akun, masuk ke Katalog, dan pilih paket PRO. Pembayaran menggunakan Midtrans (E-wallet, Transfer, QRIS) dengan aktivasi instan otomatis." />
            <FAQItem question="Apakah materi soal selalu diupdate?" answer="Ya, bank soal kami diperbarui setiap minggu mengikuti tren kisi-kisi dan FR terbaru dari pelaksanaan CAT BKN sebenarnya." />
            <FAQItem question="Bisa dikerjakan di HP?" answer="Tentu. Platform kami sepenuhnya responsif dan dapat diakses dengan lancar melalui browser ponsel Anda." />
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-600/10 opacity-50" />
        <div className="max-w-7xl mx-auto relative">
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-600 rounded-[3rem] p-16 md:p-24 text-center space-y-10 shadow-3xl">
            <h2 className="text-4xl md:text-6xl font-black text-white leading-tight">
              Masa Depan Anda <br /> Dimulai Hari Ini.
            </h2>
            <p className="text-indigo-100 text-xl max-w-2xl mx-auto opacity-80">
              Jangan biarkan mimpi Anda menjadi ASN terhambat hanya karena kurang simulasi. Gabung dengan 50rb+ pejuang lainnya.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-4">
              <Link href="/register" className="w-full sm:w-auto">
                <Button className="h-16 px-12 text-xl font-black bg-white text-indigo-600 hover:bg-slate-100 rounded-2xl w-full shadow-2xl">
                  Ambil Kesempatan Ini
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-slate-900 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div className="space-y-6">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-6 h-6 text-indigo-500" />
                <span className="font-bold text-xl">CAT CPNS <span className="text-indigo-500">PRO</span></span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed">
                Platform simulasi ujian CPNS paling akurat dan andal di Indonesia. Membantu pejuang ASN mewujudkan mimpi sejak 2024.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-white uppercase text-xs tracking-widest">Produk</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><Link href="/catalog" className="hover:text-indigo-400 transition-colors">Paket Latihan</Link></li>
                <li><Link href="/catalog?weekly=true" className="hover:text-indigo-400 transition-colors">Tryout Mingguan</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-white uppercase text-xs tracking-widest">Dukungan</h4>
              <ul className="space-y-4 text-sm text-slate-500">
                <li><Link href="/support" className="hover:text-indigo-400 transition-colors">Support Hub</Link></li>
                <li><Link href="/faq" className="hover:text-indigo-400 transition-colors">Pusat Bantuan</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 text-white uppercase text-xs tracking-widest">Kontak</h4>
              <p className="text-sm text-slate-500">Email: support@catcpnspro.com</p>
              <p className="text-sm text-slate-500">WhatsApp: +62 812-3456-7890</p>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-900 text-center">
            <p className="text-slate-600 text-xs">
              © 2026 CAT CPNS Simulation Platform. Build with Passion for Your Future Career.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepItem({ number, title, description }: { number: string, title: string, description: string }) {
  return (
    <div className="flex gap-6 group">
      <div className="text-indigo-500 font-black text-2xl opacity-30 group-hover:opacity-100 transition-opacity">{number}</div>
      <div className="space-y-1">
        <h4 className="font-bold text-xl">{title}</h4>
        <p className="text-slate-500 text-sm">{description}</p>
      </div>
    </div>
  );
}

function PriceItem({ text, white }: { text: string, white?: boolean }) {
  return (
    <li className="flex items-center gap-3">
      <CheckCircle2 className={`w-5 h-5 ${white ? 'text-white' : 'text-indigo-500'}`} />
      <span className="text-sm">{text}</span>
    </li>
  );
}

function FAQItem({ question, answer }: { question: string, answer: string }) {
  return (
    <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-slate-700 transition-all">
      <h4 className="text-lg font-bold mb-3">{question}</h4>
      <p className="text-slate-400 text-sm leading-relaxed">{answer}</p>
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
