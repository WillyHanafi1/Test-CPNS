"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export default function DashboardPage() {
  const { user, logout, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <h1 className="text-2xl font-bold mb-4">Not Authenticated</h1>
        <p className="mb-8 text-slate-400">Please log in to access the dashboard.</p>
        <Button onClick={() => window.location.href = '/login'}>Go to Login</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <span className="font-bold text-lg">CPNS</span>
            </div>
            <span className="font-semibold text-lg hidden sm:inline-block">V2.0</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 mr-2">
              <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                <User className="h-4 w-4 text-indigo-400" />
              </div>
              <span className="text-sm font-medium hidden sm:inline-block">{user.email}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={logout} className="text-slate-400 hover:text-white">
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <header className="mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Welcome Back!</h1>
          <p className="text-slate-400 text-lg">You are successfully logged in to the CPNS Platform.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl hover:border-indigo-500/50 transition-all duration-300">
            <h3 className="text-xl font-semibold mb-2">My Progress</h3>
            <p className="text-slate-400 mb-6">Track your scores and performance over time.</p>
            <Button variant="secondary" className="w-full">View Stats</Button>
          </div>
          
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl hover:border-indigo-500/50 transition-all duration-300">
            <h3 className="text-xl font-semibold mb-2">Exam Catalog</h3>
            <p className="text-slate-400 mb-6">Browse hundreds of practice questions and packages.</p>
            <Button variant="secondary" className="w-full">Explore Catalog</Button>
          </div>
          
          <div className="bg-slate-900/50 border border-slate-800 p-8 rounded-2xl hover:border-indigo-500/50 transition-all duration-300 border-indigo-500/30 ring-1 ring-indigo-500/20">
            <h3 className="text-xl font-semibold mb-2">Launch CAT</h3>
            <p className="text-slate-400 mb-6">Start a simulated Computer Assisted Test session.</p>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700">Begin Trial</Button>
          </div>
        </div>
      </main>
    </div>
  );
}
