'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Brain, Target, ShieldCheck, Loader2, AlertCircle, TrendingUp } from 'lucide-react';

interface AIAnalysis {
    summary: string;
    weaknesses: string[];
    action_plan: string[];
    motivation: string;
}

interface AIAnalysisCardProps {
    status: string; // none, processing, completed, failed
    data?: AIAnalysis | null;
    isPro: boolean;
    onGenerate: () => void;
}

export default function AIAnalysisCard({ status, data, isPro, onGenerate }: AIAnalysisCardProps) {
    const router = useRouter();

    if (!isPro) {
        // ... (existing !isPro code)
        return (
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl">
                <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-blue-500/20 blur-3xl"></div>
                
                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="mb-6 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 p-4 shadow-lg shadow-blue-500/20">
                        <Sparkles className="h-8 w-8 text-white" />
                    </div>
                    
                    <h3 className="mb-2 text-2xl font-bold text-white">Analisis Tutor AI</h3>
                    <p className="mb-6 max-w-md text-slate-400">
                        Dapatkan analisis mendalam, identifikasi kelemahan spesifik, dan action plan untuk meningkatkan skor Anda.
                    </p>
                    
                    <button 
                        onClick={() => router.push('/pricing')}
                        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-blue-500/30"
                    >
                        <ShieldCheck className="h-5 w-5" />
                        Upgrade Pro untuk Akses
                    </button>
                    
                    <p className="mt-4 text-xs text-slate-500">Mulai dari Rp 49.000 / paket</p>
                </div>
            </div>
        );
    }

    if (status === 'none' || (!data && status !== 'processing' && status !== 'failed')) {
        return (
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/50 p-8 backdrop-blur-xl">
                 <div className="absolute -left-8 -top-8 h-32 w-32 rounded-full bg-purple-500/10 blur-3xl"></div>
                 
                 <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="mb-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
                        <Brain className="h-8 w-8 text-blue-400" />
                    </div>
                    
                    <h3 className="mb-2 text-2xl font-bold text-white">Siap Untuk Diulas AI?</h3>
                    <p className="mb-6 max-w-md text-slate-400">
                        Tutor AI kami akan membedah jawaban Anda dan memberikan strategi belajar yang dipersonalisasi.
                    </p>
                    
                    <button 
                        onClick={onGenerate}
                        className="flex items-center gap-2 rounded-xl bg-white px-8 py-3 font-bold text-slate-900 transition-all hover:scale-105 hover:bg-blue-50"
                    >
                        <Sparkles className="h-5 w-5 text-blue-600" />
                        ✨ Generate Analisis AI
                    </button>
                 </div>
            </div>
        );
    }

    if (status === 'processing') {
        return (
            <div className="rounded-3xl border border-white/10 bg-slate-900/50 p-12 backdrop-blur-xl text-center">
                <div className="mb-6 flex justify-center">
                    <div className="relative">
                        <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
                        <Brain className="absolute inset-0 m-auto h-5 w-5 text-purple-400" />
                    </div>
                </div>
                <h3 className="text-xl font-bold text-white">Tutor AI Sedang Berpikir...</h3>
                <p className="mt-2 text-slate-400">Menganalisis hasil ujian Anda untuk memberikan rekomendasi terbaik.</p>
            </div>
        );
    }

    if (status === 'failed' || (status === 'completed' && !data)) {
        return (
            <div className="rounded-3xl border border-red-500/20 bg-red-500/5 p-8 backdrop-blur-xl text-center">
                <AlertCircle className="mx-auto mb-4 h-10 w-10 text-red-400" />
                <h3 className="text-lg font-bold text-white">Gagal Memuat Analisis AI</h3>
                <p className="mt-2 text-slate-400">Terjadi kendala saat menghubungi Tutor AI. Silakan muat ulang halaman atau coba lagi nanti.</p>
            </div>
        );
    }

    if (status === 'none' || !data) return null;

    return (
        <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-slate-900/40 p-1 backdrop-blur-3xl transition-all hover:border-blue-500/30">
            {/* Animated Background Highlights */}
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-blue-600/10 blur-[100px] transition-all group-hover:bg-blue-600/20"></div>
            <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-purple-600/10 blur-[100px] transition-all group-hover:bg-purple-600/20"></div>

            <div className="relative z-10 flex flex-col gap-6 p-6 lg:p-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-2.5">
                            <Sparkles className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Tutor AI Analysis</h3>
                            <p className="text-sm text-slate-500">Bimbingan Personal Berbasis Data</p>
                        </div>
                    </div>
                    <div className="hidden rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-400 sm:block">
                        PRO Visionary AI
                    </div>
                </div>

                {/* Summary */}
                <div className="rounded-2xl bg-white/5 p-5 ring-1 ring-white/10 transition-colors hover:bg-white/10">
                    <p className="leading-relaxed text-slate-200">
                        {data.summary}
                    </p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Weaknesses */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-red-400">
                            <Brain className="h-5 w-5" />
                            <h4 className="font-bold">Kelemahan Terdeteksi</h4>
                        </div>
                        <ul className="flex flex-col gap-3">
                            {data.weaknesses?.map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/50"></span>
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Action Plan */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-2 text-emerald-400">
                            <Target className="h-5 w-5" />
                            <h4 className="font-bold">7-Day Action Plan</h4>
                        </div>
                        <ul className="flex flex-col gap-3">
                            {data.action_plan?.map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-slate-400">
                                    <TrendingUp className="mt-1 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Motivation Footer */}
                <div className="mt-2 flex items-center gap-4 rounded-xl border-t border-white/5 pt-6 italic text-slate-500">
                    <p className="text-sm">"{data.motivation}"</p>
                </div>
            </div>
        </div>
    );
}
