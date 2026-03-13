"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BookOpen, Heart, Menu, X, LayoutDashboard, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHome = pathname === '/';

  const navLinks = [
    { name: 'Katalog Paket', href: '/catalog' },
    { name: 'Fitur Utama', href: isHome ? '#features' : '/#features' },
    { name: 'Harga', href: isHome ? '#price' : '/#price' },
  ];

  return (
    <nav 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b",
        isScrolled 
          ? "bg-slate-950/80 backdrop-blur-xl border-slate-800/50 py-3" 
          : "bg-transparent border-transparent py-5"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 group">
          <div className="bg-indigo-600 p-2 rounded-xl shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">
            CAT CPNS <span className="text-indigo-500">PRO</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <div className="flex items-center space-x-6 text-sm font-medium text-slate-400">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href} 
                className="hover:text-white transition-colors"
              >
                {link.name}
              </Link>
            ))}
            <Link 
              href="/support" 
              className={cn(
                "transition-colors flex items-center gap-1.5 px-3 py-1 transparent rounded-full border border-pink-500/20 bg-pink-500/5",
                pathname === '/support' ? "text-pink-400 border-pink-500/40 bg-pink-500/10" : "text-pink-400/80 hover:text-pink-400"
              )}
            >
              <Heart className={cn("w-3.5 h-3.5", pathname === '/support' ? "fill-pink-500" : "fill-pink-500/50")} />
              Dukung Kami
            </Link>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-2" />

          <div className="flex items-center space-x-3">
            {user ? (
              <Link href="/dashboard">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/25 rounded-xl flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Masuk
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Daftar
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile Menu Toggle */}
        <button 
          className="md:hidden p-2 text-slate-400 hover:text-white"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-slate-950 border-b border-slate-800 p-6 space-y-6 animate-in slide-in-from-top-4 duration-200">
          <div className="flex flex-col space-y-4">
            {navLinks.map((link) => (
              <Link 
                key={link.name} 
                href={link.href} 
                className="text-lg font-medium text-slate-400 hover:text-white"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}
            <Link 
              href="/support" 
              className="text-lg font-medium text-pink-400 flex items-center gap-2"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Heart className="w-4 h-4 fill-pink-500" /> Dukung Kami
            </Link>
          </div>
          
          <div className="pt-6 border-t border-slate-900 flex flex-col gap-3">
            {user ? (
              <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg font-bold rounded-2xl">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/login" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full border-slate-800 text-white py-6 text-lg font-bold rounded-2xl">
                    Masuk
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg font-bold rounded-2xl shadow-xl shadow-indigo-500/20">
                    Daftar Sekarang
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
