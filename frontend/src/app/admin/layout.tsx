"use client";

import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  BookOpen, 
  Package, 
  CreditCard, 
  Users, 
  BarChart3, 
  LogOut, 
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Menu,
  X,
  MessageSquare
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'admin') {
        router.replace('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-400 font-medium animate-pulse">Memverifikasi Hak Akses Admin...</p>
      </div>
    );
  }

  const navItems = [
    { name: 'Overview', icon: LayoutDashboard, href: '/admin' },
    { name: 'Bank Soal', icon: BookOpen, href: '/admin/questions' },
    { name: 'Paket Ujian', icon: Package, href: '/admin/packages' },
    { name: 'Transaksi', icon: CreditCard, href: '/admin/transactions' },
    { name: 'Pengguna', icon: Users, href: '/admin/users' },
    { name: 'Saran', icon: MessageSquare, href: '/admin/feedback' },
    { name: 'Analitik', icon: BarChart3, href: '/admin/analytics' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex overflow-hidden">
      {/* Sidebar Desktop */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col p-6">
          {/* Logo */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-black text-xl tracking-tighter leading-none">ADMIN</h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">CPNS Platform</p>
              </div>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/10' 
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  }`}
                >
                  <div className="flex items-center">
                    <item.icon className={`w-5 h-5 mr-3 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                    <span className="font-bold text-sm tracking-tight">{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-indigo-200" />}
                </Link>
              );
            })}
          </nav>

          {/* User & Logout */}
          <div className="pt-6 border-t border-slate-800 space-y-4">
            <div className="flex items-center px-2 space-x-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-400 p-0.5">
                <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center">
                   <Users className="w-5 h-5 text-indigo-400" />
                </div>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="font-bold text-sm truncate">{user.email}</p>
                <div className="flex items-center mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse mr-2" />
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Master Admin</p>
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={logout}
              className="w-full border-slate-800 bg-slate-800/20 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 py-6 rounded-2xl border-2 transition-all font-bold"
            >
              <LogOut className="w-5 h-5 mr-2" />
              Keluar Panel
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-slate-900/50 backdrop-blur-md border-b border-slate-800 p-4 sticky top-0 z-40 flex items-center justify-between">
          <button onClick={() => setIsSidebarOpen(true)} className="text-slate-400">
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-indigo-500" />
            <span className="font-black text-sm tracking-tighter">CPNS ADMIN</span>
          </div>
          <div className="w-6 h-6" /> {/* Placeholder for balance */}
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
          {children}
        </main>
      </div>
    </div>
  );
}
