"use client";

import React, { useEffect, useState } from 'react';
import { PackageCard } from '@/components/PackageCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, BookOpen, User } from 'lucide-react';
import Link from 'next/link';

interface Package {
  id: string;
  title: string;
  description: string;
  price: number;
  is_premium: boolean;
  category: string;
}

export default function CatalogPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    const fetchPackages = async () => {
      setLoading(true);
      try {
        let url = 'http://localhost:8000/api/v1/packages/';
        const params = new URLSearchParams();
        if (category) params.append('category', category);
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setPackages(data);
        }
      } catch (error) {
        console.error("Failed to fetch packages", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, [category]);

  const filteredPackages = packages.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">CPNS Catalog</span>
          </Link>
          <div className="flex items-center space-x-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight mb-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Katalog Paket Ujian
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            Pilih paket simulasi SKD dan SKB terbaik untuk persiapan ujian CPNS Anda. Semua paket dirancang sesuai standar BKN terbaru.
          </p>
        </header>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Cari paket ujian..." 
              className="pl-10 bg-slate-900/50 border-slate-800 focus:ring-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['Semua', 'TWK', 'TIU', 'TKP', 'Mix'].map((cat) => (
              <Button 
                key={cat}
                variant={ (cat === 'Semua' && !category) || category === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(cat === 'Semua' ? null : cat)}
                className={ (cat === 'Semua' && !category) || category === cat ? 'bg-indigo-600' : 'border-slate-800'}
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-64 bg-slate-900/20 animate-pulse rounded-xl border border-slate-800" />
            ))}
          </div>
        ) : filteredPackages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg) => (
              <PackageCard key={pkg.id} {...pkg} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-900/20 rounded-2xl border border-slate-800 border-dashed">
            <Filter className="h-12 w-12 text-slate-700 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-300">Tidak ada paket ditemukan</h3>
            <p className="text-slate-500">Coba ubah kata kunci pencarian atau filter kategori Anda.</p>
          </div>
        )}
      </main>
    </div>
  );
}
