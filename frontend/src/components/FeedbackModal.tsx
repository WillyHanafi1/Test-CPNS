"use client";

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { X, MessageSquare, Send, Loader2, Bug, Lightbulb, HelpCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackCategory = 'suggestion' | 'bug' | 'correction' | 'other';

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState<FeedbackCategory>('suggestion');
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('Silakan tuliskan saran atau masukan Anda.');
      return;
    }

    if (!user) {
      toast.error('Silakan login terlebih dahulu.');
      return;
    }

    setIsLoading(true);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

    try {
      const response = await fetch(`${API_URL}/api/v1/user/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          content,
          path_context: window.location.pathname
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Gagal mengirim saran');
      }

      toast.success('Terima kasih! Saran Anda telah kami terima.');
      setContent('');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
      <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
        <CardHeader className="relative border-b border-slate-800 pb-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="absolute right-2 top-2 text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <MessageSquare className="h-6 w-6 text-indigo-500" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Kirim Saran & Feedback</CardTitle>
              <CardDescription className="text-slate-400">Masukanmu sangat berharga untuk pengembangan kami.</CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 space-y-6">
          {/* Kategori */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-300">Kategori</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'suggestion', label: 'Saran', icon: Lightbulb, color: 'text-amber-400' },
                { id: 'bug', label: 'Bug', icon: Bug, color: 'text-rose-400' },
                { id: 'correction', label: 'Koreksi Soal', icon: HelpCircle, color: 'text-emerald-400' },
                { id: 'other', label: 'Lainnya', icon: MessageSquare, color: 'text-indigo-400' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategory(cat.id as FeedbackCategory)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 ${category === cat.id ? 'bg-indigo-600/20 border-indigo-500 shadow-lg shadow-indigo-500/10' : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'}`}
                >
                  <cat.icon className={`h-5 w-5 mb-1 ${category === cat.id ? 'text-indigo-400' : 'text-slate-500'}`} />
                  <span className={`text-xs font-medium ${category === cat.id ? 'text-white' : 'text-slate-400'}`}>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Isi Pesan */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Isi Pesan</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ceritakan apa yang bisa kami tingkatkan atau laporkan kendala yang Anda hadapi..."
              className="w-full min-h-[150px] p-4 rounded-xl bg-slate-950/50 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm resize-none"
            />
          </div>

          <Button 
            onClick={handleSubmit}
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg font-bold shadow-lg shadow-indigo-500/20 rounded-xl"
          >
            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
            Kirim Feedback
          </Button>

          <p className="text-[10px] text-center text-slate-500">
            Terima kasih telah berkontribusi membuat platform ini menjadi lebih baik.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
