"use client";

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { PackageCard } from '@/components/PackageCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, BookOpen, AlertTriangle, RefreshCw, Zap } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface Package {
  id: string;
  title: string;
  description: string;
  price: number;
  is_premium: boolean;
  category: string;
  is_weekly: boolean;
  start_at: string | null;
  end_at: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';
const CATEGORIES = ['Semua', 'TWK', 'TIU', 'TKP', 'Mix'];

export default function CatalogPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const { user } = useAuth();
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Debounce search input (300ms)
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      if (debouncedSearch) params.append('search', debouncedSearch); // server-side search

      const url = `${API_URL}/api/v1/packages/${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Server error: ${response.status}`);
      const data = await response.json();
      setPackages(data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat paket ujian. Periksa koneksi Anda.');
      setPackages([]);
    } finally {
      setLoading(false);
    }
  }, [category, debouncedSearch]); // Re-fetch whenever category OR debouncedSearch changes (server-side filtering)

  useEffect(() => {
    fetchPackages();
    // Cleanup debounce timer on unmount
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [fetchPackages]);

  // No client-side filter needed — results come pre-filtered from the server

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2 group">
            <div className="bg-indigo-600 p-1.5 rounded-lg group-hover:bg-indigo-500 transition-colors">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">CAT CPNS</span>
          </Link>
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white hover:bg-slate-800">
              Dashboard
            </Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-extrabold tracking-tight mb-3 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Katalog Paket Ujian
            </h1>
            <p className="text-slate-400 text-lg">
              Pilih paket simulasi SKD dan SKB terbaik untuk persiapan ujian CPNS Anda. Semua paket dirancang sesuai standar BKN terbaru.
            </p>
          </div>

          {!user?.is_pro && (
            <Link href="/catalog/upgrade" className="flex-shrink-0">
               <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-2xl border border-white/10 shadow-xl shadow-indigo-500/20 relative overflow-hidden group">
                  <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
                  <div className="relative z-10 flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-xl backdrop-blur-md">
                      <Zap className="w-6 h-6 text-yellow-300 fill-yellow-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white mb-0.5">Akses Semua Paket</h3>
                      <p className="text-indigo-100 text-sm">Upgrade PRO hanya Rp 50.000</p>
                    </div>
                  </div>
               </div>
            </Link>
          )}
        </header>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              placeholder="Cari paket ujian..."
              className="pl-10 bg-slate-900/50 border-slate-800 focus:ring-indigo-500 focus:border-indigo-500 rounded-xl"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((cat) => {
              const isActive = (cat === 'Semua' && !category) || category === cat;
              return (
                <Button
                  key={cat}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCategory(cat === 'Semua' ? null : cat)}
                  className={isActive
                    ? 'bg-indigo-600 hover:bg-indigo-500 border-transparent'
                    : 'border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                  }
                >
                  {cat}
                </Button>
              );
            })}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center py-16 bg-rose-500/5 rounded-2xl border border-rose-500/20 text-center mb-8">
            <AlertTriangle className="h-12 w-12 text-rose-500 mb-4" />
            <h3 className="text-xl font-bold text-rose-400 mb-2">Gagal Memuat Paket</h3>
            <p className="text-slate-500 mb-6 max-w-sm">{error}</p>
            <Button onClick={fetchPackages} className="bg-slate-800 hover:bg-slate-700 border border-slate-700">
              <RefreshCw className="w-4 h-4 mr-2" /> Coba Lagi
            </Button>
          </div>
        )}

        {/* Grid */}
        {!error && (
          loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-64 bg-slate-900/50 animate-pulse rounded-2xl border border-slate-800" />
              ))}
            </div>
          ) : packages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <PackageCard key={pkg.id} {...pkg} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-slate-900/20 rounded-2xl border border-slate-800 border-dashed">
              <Filter className="h-12 w-12 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-300 mb-2">Tidak ada paket ditemukan</h3>
              <p className="text-slate-500">Coba ubah kata kunci pencarian atau filter kategori Anda.</p>
            </div>
          )
        )}
      </main>
    </div>
  );
}
