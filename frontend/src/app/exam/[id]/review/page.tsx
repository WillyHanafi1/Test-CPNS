"use client";

import React, { useEffect, useState, useRef } from 'react';
import MarkdownRenderer from '@/components/ui/MarkdownRenderer';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { 
  Loader2, Check, X, Info, ChevronLeft, LayoutGrid, 
  BookOpen, Home, ChevronRight, CheckCircle2, AlertCircle, HelpCircle, ZoomIn
} from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import ReviewChatPanel from '@/components/ReviewChatPanel';
import { Sparkles } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

interface Option {
  id: string;
  label: string;
  content: string;
  image_url: string | null;
  score: number;
}

interface Question {
  id: string;
  content: string;
  image_url: string | null;
  discussion: string | null;
  segment: string;
  number: number;
  options: Option[];
  selected_option_id: string | null;
}

interface ReviewData {
  session_id: string;
  package_title: string;
  total_score: number;
  score_twk: number;
  score_tiu: number;
  score_tkp: number;
  questions: Question[];
}

export default function ReviewPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();

  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const fetchReview = async () => {
      try {
        const response = await fetch(`${API_URL}/api/v1/exam/session/${id}/review`, {
          credentials: 'include'
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.detail || "Gagal memuat pembahasan");
        }
        const reviewData = await response.json();
        setData(reviewData);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchReview();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <p className="text-slate-400 animate-pulse font-medium">Memuat Pembahasan...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4 text-center">
        <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Terjadi Kesalahan</h1>
        <p className="text-slate-400 mb-6">{error || "Data tidak ditemukan"}</p>
        <Button onClick={() => router.back()} className="bg-indigo-600">Kembali</Button>
      </div>
    );
  }

  const currentQuestion = data.questions[currentIndex];
  const isCorrect = (q: Question) => {
    const selected = q.options.find(o => o.id === q.selected_option_id);
    // Standard SKD: Correct is usually score 5, TKP is 1-5.
    // We treat "correct" as having the highest possible score in that question for simplicity in indicator.
    const maxScore = Math.max(...q.options.map(o => o.score));
    return selected && selected.score === maxScore && maxScore > 0;
  };

  const isSkipped = (q: Question) => !q.selected_option_id;

  const getStatusColor = (idx: number) => {
    const q = data.questions[idx];
    const itemIsCurrent = idx === currentIndex;
    const itemIsCorrect = isCorrect(q);
    const itemIsSkipped = isSkipped(q);
    const selected = q.options.find(o => o.id === q.selected_option_id);
    const itemIsPartial = q.segment === 'TKP' && selected && selected.score > 0 && selected.score < Math.max(...q.options.map(o => o.score));

    if (itemIsCurrent) return 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950 bg-indigo-600 text-white shadow-lg shadow-indigo-500/30';
    if (itemIsSkipped) return 'bg-slate-800 text-slate-500 border border-slate-700 hover:border-slate-500';
    if (itemIsCorrect) return 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-500/30';
    if (itemIsPartial) return 'bg-amber-500/20 text-amber-500 border border-amber-500/30 hover:bg-amber-500/30';
    return 'bg-rose-500/20 text-rose-500 border border-rose-500/30 hover:bg-rose-500/30';
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col selection:bg-indigo-500/30">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50 px-4 md:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.back()}
            className="text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Kembali
          </Button>
          <div className="hidden md:block h-4 w-[1px] bg-slate-800" />
          <div className="flex flex-col">
            <h1 className="text-sm font-bold text-white leading-none mb-1 truncate max-w-[200px] md:max-w-md">
              Pembahasan: {data.package_title}
            </h1>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Review Hasil Ujian
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-2 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700">
             <span className="text-[10px] font-bold text-slate-500 uppercase">Skor:</span>
             <span className="text-sm font-black text-white">{data.total_score}</span>
          </div>
          <Link href="/dashboard">
            <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
               <Home className="w-4 h-4" />
            </Button>
          </Link>
          <Button 
            variant="ghost" 
            size="sm" 
            className="lg:hidden p-2"
            onClick={() => setSidebarOpen(true)}
          >
            <LayoutGrid className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden lg:pl-0">
        {/* Main Content Area */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-4xl mx-auto space-y-8 pb-10">
            {/* Question Card */}
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-lg">
                    {currentQuestion.number}
                  </span>
                  <Badge variant="outline" className="bg-slate-900 border-slate-800 text-slate-400 uppercase tracking-widest text-[10px]">
                    {currentQuestion.segment}
                  </Badge>
                  {currentQuestion.selected_option_id ? (
                    isCorrect(currentQuestion) ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold text-[10px]">BENAR</Badge>
                    ) : (
                      <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 font-bold text-[10px]">SALAH</Badge>
                    )
                  ) : (
                    <Badge className="bg-slate-800 text-slate-500 border-slate-700 font-bold text-[10px]">TIDAK DIJAWAB</Badge>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="text-lg md:text-xl font-medium leading-relaxed text-slate-200 overflow-x-auto">
                  <MarkdownRenderer>{currentQuestion.content ?? ''}</MarkdownRenderer>
                </div>

                {currentQuestion.image_url && (
                  <div 
                    className="rounded-2xl overflow-hidden border border-slate-800 w-full max-w-2xl mx-auto shadow-2xl bg-slate-900/40 p-2 relative group cursor-zoom-in"
                    onClick={() => setZoomImage(currentQuestion.image_url as string)}
                  >
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px] rounded-2xl">
                      <ZoomIn className="w-10 h-10 text-white opacity-80" />
                    </div>
                    <img src={currentQuestion.image_url} alt="Question Diagram" className="w-full h-auto rounded-xl object-contain" />
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {currentQuestion.options.map((option) => {
                  const isUserSelection = currentQuestion.selected_option_id === option.id;
                  const maxScore = Math.max(...currentQuestion.options.map(o => o.score));
                  const isHighestScore = option.score === maxScore && maxScore > 0;
                  const isPartialScore = currentQuestion.segment === 'TKP' && option.score > 0 && option.score < maxScore;
                  
                  let borderClass = "border-slate-800 bg-slate-900/50";
                  let labelBg = "bg-slate-800 text-slate-400";
                  
                  if (isHighestScore) {
                    borderClass = "border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20";
                    labelBg = "bg-emerald-500 text-white";
                  } else if (isUserSelection) {
                    if (isPartialScore) {
                      borderClass = "border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20";
                      labelBg = "bg-amber-500 text-white";
                    } else {
                      borderClass = "border-rose-500/50 bg-rose-500/5 ring-1 ring-rose-500/20";
                      labelBg = "bg-rose-500 text-white";
                    }
                  }

                  return (
                    <div
                      key={option.id}
                      className={`flex flex-col p-4 rounded-2xl border transition-all duration-300 relative ${borderClass}`}
                    >
                      <div className="flex items-start">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm mr-3 shrink-0 ${labelBg}`}>
                          {option.label}
                        </div>
                        <div className="flex-1 pt-1">
                           <div className={`text-sm md:text-base overflow-x-auto ${isHighestScore || isUserSelection ? 'text-white font-medium' : 'text-slate-400'}`}>
                             <MarkdownRenderer>{option.content ?? ''}</MarkdownRenderer>
                           </div>
                          {option.image_url && (
                            <div 
                              className="mt-3 bg-white rounded-lg p-2 border border-slate-700 max-w-[150px] relative cursor-zoom-in group/opt"
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoomImage(option.image_url as string);
                              }}
                            >
                              <img src={option.image_url} alt={`Option ${option.label}`} className="w-full h-auto object-contain" />
                              <div className="absolute inset-0 bg-slate-900/10 opacity-0 group-hover/opt:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                                 <ZoomIn className="w-6 h-6 text-slate-800" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0 ml-2">
                          <span className={`text-[10px] font-bold ${option.score > 0 ? 'text-emerald-500' : 'text-slate-600'}`}>
                            +{option.score} Poin
                          </span>
                          {isUserSelection && (
                             <span className="text-[9px] font-black uppercase text-indigo-400">Pilihan Anda</span>
                          )}
                        </div>
                      </div>
                      
                      {isHighestScore && (
                        <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-1 border-2 border-slate-950">
                           <Check className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {isUserSelection && !isHighestScore && (
                        <div className={`absolute -top-2 -right-2 ${isPartialScore ? 'bg-amber-500' : 'bg-rose-500'} rounded-full p-1 border-2 border-slate-950`}>
                           {isPartialScore ? <AlertCircle className="w-3 h-3 text-white" /> : <X className="w-3 h-3 text-white" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Discussion Section */}
              <div className="mt-12 space-y-4 pt-8 border-t border-slate-900 animate-in fade-in slide-in-from-top-4 duration-700 delay-300">
                <div className="flex items-center justify-between text-indigo-400">
                  <div className="flex items-center space-x-2">
                    <BookOpen className="w-5 h-5" />
                    <h3 className="font-bold text-lg">Pembahasan Jawaban</h3>
                  </div>
                  <Button 
                    onClick={() => setChatOpen(true)}
                    className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border-0 shadow-lg shadow-indigo-600/20 rounded-xl h-9 px-4 animate-pulse-subtle"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-2 fill-white" />
                    Tanya Tutor AI
                  </Button>
                </div>
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 md:p-8 space-y-4">
                  {currentQuestion.discussion ? (
                    <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed whitespace-pre-line overflow-x-auto">
                      <MarkdownRenderer>{currentQuestion.discussion ?? ''}</MarkdownRenderer>
                    </div>
                  ) : (
                    <div className="flex items-center text-slate-500 italic py-4">
                      <HelpCircle className="w-5 h-5 mr-3 opacity-50" />
                      Belum ada penjelasan khusus untuk soal ini.
                    </div>
                  )}
                  
                  <div className="bg-indigo-500/5 rounded-2xl p-4 border border-indigo-500/10 flex items-start gap-3 mt-4">
                    <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Sesuai Kepmenpan RB 321/2024, nilai kelulusan ditentukan oleh ambang batas per kategori. Gunakan pembahasan ini untuk memahami pola soal dan meningkatkan akurasi diagnosa jawaban Anda berikutnya.
                    </p>
                  </div>
                </div>
              </div>

              {/* Navigation Footer */}
              <div className="pt-8 flex items-center justify-between">
                <Button
                  variant="ghost"
                  disabled={currentIndex === 0}
                  onClick={() => {
                    setCurrentIndex(currentIndex - 1);
                    scrollToTop();
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" /> Soal Sebelumnya
                </Button>
                
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:block">
                  No. {currentQuestion.number} dari {data.questions.length}
                </span>

                <Button
                  disabled={currentIndex === data.questions.length - 1}
                  onClick={() => {
                    setCurrentIndex(currentIndex + 1);
                    scrollToTop();
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/20"
                >
                  Soal Selanjutnya <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Sidebar */}
        <aside className="w-80 border-l border-slate-800 bg-slate-900/50 hidden lg:block overflow-y-auto custom-scrollbar">
           <SidebarContent 
             data={data} 
             currentIndex={currentIndex} 
             setCurrentIndex={setCurrentIndex} 
             getStatusColor={getStatusColor}
             scrollToTop={scrollToTop}
           />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <div className="relative ml-auto w-80 bg-slate-900 border-l border-slate-800 overflow-y-auto shadow-2xl animate-in slide-in-from-right duration-300">
               <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Daftar Soal</span>
                  <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
               </div>
                <SidebarContent 
                  data={data} 
                  currentIndex={currentIndex} 
                  setCurrentIndex={setCurrentIndex} 
                  getStatusColor={getStatusColor}
                  onClose={() => setSidebarOpen(false)}
                  scrollToTop={scrollToTop}
                />
            </div>
          </div>
        )}
      </main>

      {/* AI Mentor Chat Panel */}
      <ReviewChatPanel 
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        examSessionId={data.session_id}
        questionId={currentQuestion.id}
        questionNumber={currentQuestion.number}
        packageTitle={data.package_title}
      />

      {/* Lightbox Modal */}
      {zoomImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-200" 
          onClick={() => setZoomImage(null)}
        >
          <button 
            className="absolute top-6 right-6 p-3 bg-slate-800 hover:bg-slate-700 rounded-full text-white transition-colors shadow-2xl"
            onClick={() => setZoomImage(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={zoomImage} 
            alt="Zoomed Content" 
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl ring-1 ring-slate-800" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

interface SidebarProps {
  data: ReviewData;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  getStatusColor: (index: number) => string;
  onClose?: () => void;
  scrollToTop: () => void;
}

function SidebarContent({ data, currentIndex, setCurrentIndex, getStatusColor, onClose, scrollToTop }: SidebarProps) {
  const categories = ["TWK", "TIU", "TKP"];
  
  return (
    <div className="p-5 space-y-8">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-2">
         {[
           { label: 'TWK', score: data.score_twk, color: 'text-indigo-400' },
           { label: 'TIU', score: data.score_tiu, color: 'text-emerald-400' },
           { label: 'TKP', score: data.score_tkp, color: 'text-amber-400' },
         ].map(stat => (
           <div key={stat.label} className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800 flex flex-col items-center">
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">{stat.label}</span>
              <span className={`text-sm font-black ${stat.color}`}>{stat.score}</span>
           </div>
         ))}
      </div>

      <div className="space-y-6">
        {categories.map(cat => {
          const catQuestions = data.questions.filter((q: Question) => q.segment === cat);
          if (catQuestions.length === 0) return null;

          return (
            <div key={cat} className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center justify-between pr-2">
                {cat} <span>({catQuestions.length} Soal)</span>
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {catQuestions.map((q: Question) => {
                  // Find original index in data.questions
                  const realIndex = data.questions.findIndex((origQ: Question) => origQ.id === q.id);
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        setCurrentIndex(realIndex);
                        onClose?.();
                        scrollToTop();
                      }}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-all duration-200 ${getStatusColor(realIndex)}`}
                    >
                      {q.number}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="space-y-2 border-t border-slate-800 pt-6">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Keterangan</h3>
        {[
          { color: 'bg-emerald-500', label: 'Benar (Point Max)' },
          { color: 'bg-amber-500', label: 'TKP Berpoin (Poin 1-4)' },
          { color: 'bg-rose-500', label: 'Salah / Poin 0' },
          { color: 'bg-slate-700', label: 'Tidak Dijawab' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center space-x-3">
            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-[10px] text-slate-400 font-medium">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
