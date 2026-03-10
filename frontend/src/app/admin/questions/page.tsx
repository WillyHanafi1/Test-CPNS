"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Upload, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  BookOpen,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function QuestionsAdmin() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPackageId, setImportPackageId] = useState('');
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    fetchPackages();
    fetchQuestions();
  }, [page, selectedPackage]);

  const fetchPackages = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/packages`, { 
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' 
      });
      const data = await response.json();
      setPackages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Fetch packages error:", error);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/admin/questions?page=${page}&size=10`;
      if (selectedPackage) url += `&package_id=${selectedPackage}`;
      
      const response = await fetch(url, { 
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' 
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const data = await response.json();
      setQuestions(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Fetch questions error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !importPackageId) return;

    setImportLoading(true);
    const formData = new FormData();
    formData.append('file', importFile);
    
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/import/questions?package_id=${importPackageId}`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      const data = await response.json();
      if (response.ok) {
        setMessage({ type: 'success', text: data.message });
        setIsImportModalOpen(false);
        fetchQuestions();
      } else {
        setMessage({ type: 'error', text: data.detail || 'Import gagal' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan sistem' });
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-1">Bank Soal</h1>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Total {total} Soal Terdaftar</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            className="border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:text-white rounded-2xl py-6 px-6 font-bold"
            onClick={() => setIsImportModalOpen(true)}
          >
            <Upload className="w-5 h-5 mr-2" />
            Import Excel
          </Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl py-6 px-10 font-bold shadow-xl shadow-indigo-600/20">
            <Plus className="w-5 h-5 mr-2" />
            Tambah Manual
          </Button>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-2xl flex items-center space-x-3 animate-in slide-in-from-top-4 duration-500 ${
          message.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <p className="font-bold text-sm tracking-tight">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Filters & Search */}
      <Card className="bg-slate-900/40 border-slate-800/60 rounded-[2rem] overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <Input 
                placeholder="Cari konten soal..." 
                className="pl-12 bg-slate-950/50 border-slate-800/80 rounded-2xl py-7 font-medium md:text-lg focus:ring-indigo-500 focus:border-indigo-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-3">
               <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl px-4 py-3 flex items-center min-w-[200px]">
                  <Filter className="w-4 h-4 text-slate-500 mr-2" />
                  <select 
                    className="bg-transparent text-sm font-bold text-slate-300 focus:outline-none w-full appearance-none pr-10"
                    value={selectedPackage}
                    onChange={(e) => {
                      setSelectedPackage(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Semua Paket</option>
                    {packages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                  </select>
               </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="bg-slate-900/20 border border-slate-800/40 rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-900/50 border-b border-slate-800">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">No.</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Segment</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Konten Soal</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500">Opsi / Jawaban</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                [1,2,3,4,5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-8"><div className="h-4 bg-slate-800 rounded w-full" /></td>
                  </tr>
                ))
              ) : questions.map((q) => (
                <tr key={q.id} className="hover:bg-slate-900/30 transition-colors group">
                  <td className="px-8 py-6">
                    <span className="font-black text-slate-500 group-hover:text-indigo-400 transition-colors">{q.number}</span>
                  </td>
                  <td className="px-8 py-6">
                    <Badge className={`rounded-xl py-1 px-3 font-bold text-[10px] border-none tracking-widest ${
                      q.segment === 'TWK' ? 'bg-blue-500/10 text-blue-400' :
                      q.segment === 'TIU' ? 'bg-indigo-500/10 text-indigo-400' :
                      'bg-orange-500/10 text-orange-400'
                    }`}>
                      {q.segment}
                    </Badge>
                  </td>
                  <td className="px-8 py-6 max-w-md">
                    <p className="text-sm font-medium text-slate-200 line-clamp-2 leading-relaxed">{q.content}</p>
                  </td>
                  <td className="px-8 py-6">
                     <div className="flex -space-x-2">
                        {[1,2,3,4,5].map(o => (
                          <div key={o} className="w-7 h-7 rounded-lg bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-500">
                            {String.fromCharCode(64 + o)}
                          </div>
                        ))}
                     </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center justify-center space-x-2">
                       <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl hover:bg-slate-800 hover:text-white transition-all">
                          <Edit className="w-4 h-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl hover:bg-rose-500/10 hover:text-rose-400 transition-all">
                          <Trash2 className="w-4 h-4" />
                       </Button>
                       <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl hover:bg-slate-800">
                          <MoreVertical className="w-4 h-4" />
                       </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && questions.length === 0 && (
                <tr>
                   <td colSpan={5} className="px-8 py-20 text-center">
                      <BookOpen className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                      <p className="text-slate-600 font-bold uppercase tracking-widest text-xs">Belum ada soal ditemukan</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-slate-900/50 px-8 py-6 flex items-center justify-between border-t border-slate-800">
           <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
              Showing <span className="text-slate-300">{(page-1)*10+1}</span> to <span className="text-slate-300">{Math.min(page*10, total)}</span> of <span className="text-slate-300">{total}</span>
           </p>
           <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="w-10 h-10 rounded-xl border-slate-800 bg-slate-950"
                onClick={() => setPage(p => Math.max(1, p-1))}
                disabled={page === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="bg-indigo-600 text-white w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shadow-lg shadow-indigo-600/20">
                {page}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="w-10 h-10 rounded-xl border-slate-800 bg-slate-950"
                onClick={() => setPage(p => p + 1)}
                disabled={page*10 >= total}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
           </div>
        </div>
      </div>

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsImportModalOpen(false)} />
           <Card className="relative w-full max-w-xl bg-slate-900 border-slate-800 border-2 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                       <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                          <FileSpreadsheet className="w-6 h-6 text-indigo-500" />
                       </div>
                       <div>
                          <h2 className="text-2xl font-black tracking-tight">Mass Import Soal</h2>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Excel / CSV Uploader</p>
                       </div>
                    </div>
                    <button onClick={() => setIsImportModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                       <X className="w-6 h-6" />
                    </button>
                 </div>

                 <form onSubmit={handleImport} className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Pilih Paket Tujuan</label>
                       <select 
                         required
                         className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                         value={importPackageId}
                         onChange={(e) => setImportPackageId(e.target.value)}
                       >
                          <option value="">Pilih Paket...</option>
                          {packages.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                       </select>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">File Soal (.xlsx / .csv)</label>
                       <div className={`border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center transition-all ${
                         importFile ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-slate-800 hover:border-slate-700'
                       }`}>
                          <input 
                            type="file" 
                            accept=".xlsx,.csv" 
                            className="hidden" 
                            id="file-upload"
                            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                          />
                          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                             <Upload className={`w-10 h-10 mb-4 ${importFile ? 'text-indigo-400' : 'text-slate-600'}`} />
                             <p className="text-sm font-bold text-slate-400">{importFile ? importFile.name : 'Pilih file atau drag & drop'}</p>
                             <p className="text-[10px] text-slate-600 mt-2 font-medium">Max size: 10MB</p>
                          </label>
                       </div>
                    </div>

                    <div className="pt-4 flex space-x-3">
                       <Button 
                         type="button" 
                         variant="ghost" 
                         className="flex-1 py-7 rounded-2xl font-bold text-slate-400"
                         onClick={() => setIsImportModalOpen(false)}
                       >
                          Batal
                       </Button>
                       <Button 
                         type="submit" 
                         className="flex-[2] bg-indigo-600 hover:bg-indigo-700 py-7 rounded-2xl font-bold shadow-xl shadow-indigo-600/20"
                         disabled={importLoading || !importFile || !importPackageId}
                       >
                          {importLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                          Mulai Import Data
                       </Button>
                    </div>
                 </form>
              </div>
           </Card>
        </div>
      )}
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
  return <div className={`border-2 border-white border-t-transparent rounded-full ${className}`} />;
}
