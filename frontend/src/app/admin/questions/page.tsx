"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'react-hot-toast';
import Latex from 'react-latex-next';
import 'katex/dist/katex.min.css';
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
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  AdminPageHeader, 
  AdminDataTable, 
  AdminPagination, 
  ConfirmModal,
  Column 
} from '@/components/admin';
import { useQuestions } from '@/hooks/useQuestions';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function QuestionsAdmin() {
  const {
    questions,
    loading,
    total,
    page,
    setPage,
    search,
    setSearch,
    selectedPackage,
    setSelectedPackage,
    selectedIds,
    setSelectedIds,
    fetchQuestions,
    deleteQuestion,
    bulkDeleteQuestions,
    toggleSelect,
    toggleSelectAll
  } = useQuestions();

  const [packages, setPackages] = useState<any[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPackageId, setImportPackageId] = useState('');
  const [importErrors, setImportErrors] = useState<string[]>([]);
  
  // Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<any>({
    content: '',
    segment: 'TWK',
    number: 1,
    image_url: '',
    discussion: '',
    options: [
      { label: 'A', content: '', score: 0 },
      { label: 'B', content: '', score: 0 },
      { label: 'C', content: '', score: 0 },
      { label: 'D', content: '', score: 0 },
      { label: 'E', content: '', score: 0 },
    ]
  });

  const [formLoading, setFormLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      // Peningkatan limit (size=100) agar semua paket muncul di dropdown admin
      const response = await fetch(`${API_URL}/api/v1/admin/packages?size=100`, { 
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' 
      });
      const data = await response.json();
      
      // FIX: Backend mengirimkan { items: [], total: x, ... }, bukan Array langsung
      if (data && data.items && Array.isArray(data.items)) {
        setPackages(data.items);
      } else {
        setPackages(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Fetch packages error:", error);
    }
  };

  const handleDelete = async (questionId: string) => {
    await deleteQuestion(questionId);
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleBulkDelete = async () => {
    await bulkDeleteQuestions();
    setBulkDeleteConfirmOpen(false);
  };

  const saveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    
    try {
      const isNew = !isEditing;
      const url = isNew 
        ? `${API_URL}/api/v1/admin/questions` 
        : `${API_URL}/api/v1/admin/questions/${currentQuestion.id}`;
      
      const method = isNew ? 'POST' : 'PUT';
      
      const payload = { 
        ...currentQuestion,
        // Ensure option IDs are present if they exist in the incoming object for Upsert support
        options: currentQuestion.options.map((opt: any) => ({
          id: opt.id || undefined,
          label: opt.label,
          content: opt.content,
          image_url: opt.image_url,
          score: opt.score
        }))
      };
      
      if (isNew) payload.package_id = selectedPackage || importPackageId;

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include'
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Gagal menyimpan soal');
      }

      toast.success(`Soal berhasil ${isNew ? 'ditambah' : 'diupdate'}`);
      setIsDrawerOpen(false);
      fetchQuestions();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleScoreChange = (index: number, value: number) => {
    const updatedOptions = currentQuestion.options.map((opt: any, i: number) => {
      if (currentQuestion.segment === 'TKP') {
        return i === index ? { ...opt, score: value } : opt;
      } else {
        return { ...opt, score: i === index ? 5 : 0 };
      }
    });
    
    setCurrentQuestion({ ...currentQuestion, options: updatedOptions });
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile || !importPackageId) return;

    setImportLoading(true);
    setImportErrors([]);
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
        toast.success(data.message);
        setIsImportModalOpen(false);
        setImportFile(null);
        fetchQuestions();
      } else {
        // Handle detailed errors from backend refactor
        if (data.detail && typeof data.detail === 'object' && data.detail.errors) {
          setImportErrors(data.detail.errors);
          toast.error(data.detail.message || 'Validasi file gagal');
        } else {
          toast.error(data.detail || 'Import gagal');
        }
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setImportLoading(false);
    }
  };

  const columns: Column<any>[] = [
    { 
      header: 'No.', 
      accessor: 'number',
      className: 'w-20',
      render: (q) => (
        <span className="font-black text-slate-500 group-hover:text-indigo-400 transition-colors">{q.number}</span>
      )
    },
    { 
      header: 'Segment', 
      render: (q) => (
        <Badge className={`rounded-xl py-1 px-3 font-bold text-[10px] border-none tracking-widest ${
          q.segment === 'TWK' ? 'bg-blue-500/10 text-blue-400' :
          q.segment === 'TIU' ? 'bg-indigo-500/10 text-indigo-400' :
          'bg-orange-500/10 text-orange-400'
        }`}>
          {q.segment}
        </Badge>
      )
    },
    { 
      header: 'Konten Soal', 
      className: 'max-w-md',
      render: (q) => (
        <div className="text-sm font-medium text-slate-200 line-clamp-2 leading-relaxed overflow-x-auto">
          <Latex strict={false}>{q.content ?? ''}</Latex>
        </div>
      )
    },
    { 
      header: 'Opsi / Jawaban', 
      render: (q) => (
        <div className="flex -space-x-2">
          {[1,2,3,4,5].map(o => (
            <div key={o} className="w-7 h-7 rounded-lg bg-slate-800 border-2 border-slate-900 flex items-center justify-center text-[10px] font-black text-slate-500">
              {String.fromCharCode(64 + o)}
            </div>
          ))}
        </div>
      )
    },
    { 
      header: 'Aksi', 
      className: 'text-center',
      render: (q) => (
        <div className="flex items-center justify-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 rounded-xl hover:bg-slate-800 hover:text-white transition-all"
            onClick={() => {
              setIsEditing(true);
              setCurrentQuestion({...q});
              setIsDrawerOpen(true);
            }}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 rounded-xl hover:bg-rose-500/10 hover:text-rose-400 transition-all"
            onClick={() => {
              setItemToDelete(q);
              setDeleteConfirmOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl hover:bg-slate-800">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 pb-20">
      <AdminPageHeader 
        title="Bank Soal" 
        subtitle={`Total ${total} Soal Terdaftar`}
        actions={
          <>
            <Button 
              variant="outline" 
              className="border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:text-white rounded-2xl py-6 px-6 font-bold"
              onClick={() => setIsImportModalOpen(true)}
            >
              <Upload className="w-5 h-5 mr-2" />
              Import Excel
            </Button>
            <Button 
              className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl py-6 px-10 font-bold shadow-xl shadow-indigo-600/20"
              onClick={() => {
                setIsEditing(false);
                setCurrentQuestion({
                  content: '',
                  segment: 'TWK',
                  number: (questions.length > 0 ? Math.max(...questions.map(q => q.number)) + 1 : 1),
                  image_url: '',
                  discussion: '',
                  options: [
                    { label: 'A', content: '', score: 0 },
                    { label: 'B', content: '', score: 0 },
                    { label: 'C', content: '', score: 0 },
                    { label: 'D', content: '', score: 0 },
                    { label: 'E', content: '', score: 0 },
                  ]
                });
                setIsDrawerOpen(true);
              }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Tambah Manual
            </Button>
          </>
        }
      />


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

      <AdminDataTable 
        columns={columns}
        data={questions}
        loading={loading}
        emptyIcon={<BookOpen className="w-12 h-12 text-slate-800" />}
        emptyText="Belum ada soal ditemukan"
        selectedIds={selectedIds}
        onSelectToggle={toggleSelect}
        onSelectAll={toggleSelectAll}
      />

      <AdminPagination 
        page={page}
        total={total}
        pageSize={10}
        onPageChange={setPage}
      />

      {/* --- BULK ACTIONS TOOLBAR --- */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl py-4 px-8 shadow-2xl flex items-center space-x-6 backdrop-blur-xl bg-opacity-90">
            <div className="flex items-center space-x-4 pr-6 border-r border-slate-800">
               <div className="w-8 h-8 bg-indigo-500 rounded-xl flex items-center justify-center font-black text-xs">
                 {selectedIds.size}
               </div>
               <span className="text-sm font-bold text-slate-300">Soal Terpilih</span>
            </div>
            <Button 
               variant="ghost" 
               className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 font-bold rounded-xl"
               onClick={() => setBulkDeleteConfirmOpen(true)}
            >
               <Trash2 className="w-4 h-4 mr-2" />
               Hapus Massal
            </Button>
            <Button 
               variant="ghost" 
               className="text-slate-400 hover:text-white font-bold rounded-xl"
               onClick={() => setSelectedIds(new Set())}
            >
               <X className="w-4 h-4 mr-2" />
               Batal
            </Button>
          </div>
        </div>
      )}

      {/* --- DRAWER EDITOR --- */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[70] overflow-hidden">
           <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
           <div className={`absolute top-0 right-0 h-full w-full max-w-2xl bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col transform transition-transform duration-500 ease-in-out ${isDrawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
              {/* Drawer Header â€” stays fixed at top */}
              <div className="flex items-center justify-between px-10 py-8 border-b border-slate-800 flex-shrink-0">
                 <div>
                    <h2 className="text-3xl font-black tracking-tight">{isEditing ? 'Edit Soal' : 'Tambah Soal Baru'}</h2>
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mt-1">CAT CPNS Engine Editor</p>
                 </div>
                 <Button variant="ghost" size="icon" onClick={() => setIsDrawerOpen(false)} className="rounded-2xl hover:bg-slate-900">
                    <X className="w-6 h-6" />
                 </Button>
              </div>

              {/* Scrollable content area */}
              <div className="flex-1 overflow-y-auto p-10">

                 <form id="question-form" onSubmit={saveQuestion} className="space-y-8">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Segmen / Kategori</label>
                          <select 
                            className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-sm font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
                            value={currentQuestion.segment}
                            onChange={(e) => setCurrentQuestion({...currentQuestion, segment: e.target.value})}
                          >
                             <option value="TWK">TWK (Wawasan Kebangsaan)</option>
                             <option value="TIU">TIU (Intelegensia Umum)</option>
                             <option value="TKP">TKP (Karakteristik Pribadi)</option>
                          </select>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nomor Soal</label>
                          <Input 
                             type="number"
                             value={currentQuestion.number}
                             onChange={(e) => setCurrentQuestion({...currentQuestion, number: parseInt(e.target.value)})}
                             className="bg-slate-900 border-slate-800 p-7 rounded-2xl font-bold"
                          />
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Konten Pertanyaan</label>
                       <textarea 
                          className="w-full h-40 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-sm font-medium text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed"
                          value={currentQuestion.content}
                          onChange={(e) => setCurrentQuestion({...currentQuestion, content: e.target.value})}
                          placeholder="Ketik pertanyaan di sini..."
                       />
                    </div>

                    {/* Options */}
                    <div className="space-y-4">
                       <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Pilihan Jawaban & Skor</label>
                       <div className="space-y-3">
                          {currentQuestion.options.map((opt: any, index: number) => (
                             <div key={index} className="flex gap-3 group">
                                <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center font-black text-slate-500 group-hover:border-indigo-500 group-hover:text-indigo-400 transition-colors">
                                   {opt.label}
                                </div>
                                <textarea
                                   className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none leading-relaxed min-h-[48px]"
                                   value={opt.content}
                                   rows={2}
                                   onChange={(e) => {
                                      const newOpts = [...currentQuestion.options];
                                      newOpts[index].content = e.target.value;
                                      setCurrentQuestion({...currentQuestion, options: newOpts});
                                   }}
                                   placeholder={`Opsi ${opt.label}...`}
                                />
                                {currentQuestion.segment === 'TKP' ? (
                                   <select 
                                      className="w-20 bg-slate-900 border border-slate-800 rounded-2xl px-3 text-xs font-black text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                                      value={opt.score}
                                      onChange={(e) => handleScoreChange(index, parseInt(e.target.value))}
                                   >
                                      {[1,2,3,4,5].map(v => <option key={v} value={v}>{v} Poin</option>)}
                                   </select>
                                ) : (
                                   <div 
                                      className={`w-12 h-12 rounded-2xl border flex items-center justify-center cursor-pointer transition-all ${
                                         opt.score === 5 ? 'bg-indigo-500 border-indigo-400 text-white' : 'bg-slate-900 border-slate-800 text-slate-600 hover:border-indigo-500'
                                      }`}
                                      onClick={() => handleScoreChange(index, 5)}
                                   >
                                      <CheckCircle2 className="w-5 h-5" />
                                   </div>
                                )}
                             </div>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Pembahasan (Opsional)</label>
                       <textarea 
                          className="w-full h-32 bg-slate-900 border border-slate-800 rounded-2xl p-6 text-sm font-medium text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none italic"
                          value={currentQuestion.discussion || ''}
                          onChange={(e) => setCurrentQuestion({...currentQuestion, discussion: e.target.value})}
                          placeholder="Tuliskan pembahasan soal..."
                       />
                    </div>

               </form>
            </div>

               <div className="flex-shrink-0 bg-slate-950 p-6 border-t border-slate-800 flex space-x-4">
                  <Button
                     type="button"
                     variant="ghost"
                     className="flex-1 py-7 rounded-2xl font-bold text-slate-400"
                     onClick={() => setIsDrawerOpen(false)}
                  >
                     Batal
                  </Button>
                  <Button
                     type="submit"
                     form="question-form"
                     className="flex-[2] bg-indigo-600 hover:bg-indigo-700 py-7 rounded-2xl font-bold shadow-xl shadow-indigo-600/20"
                     disabled={formLoading}
                  >
                     {formLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                     Simpan Perubahan
                  </Button>
               </div>
            </div>
         </div>
      )}

      <ConfirmModal 
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => itemToDelete && handleDelete(itemToDelete.id)}
        title="Hapus Soal?"
        description="Tindakan ini tidak dapat dibatalkan. Soal akan dihapus permanen dari database."
        confirmText="Ya, Hapus"
      />

      <ConfirmModal 
        isOpen={bulkDeleteConfirmOpen}
        onClose={() => setBulkDeleteConfirmOpen(false)}
        onConfirm={handleBulkDelete}
        title="Hapus Massal?"
        description={`Apakah Anda yakin ingin menghapus ${selectedIds.size} soal terpilih sekaligus?`}
        confirmText="Ya, Hapus Semua"
      />

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
                    <button onClick={() => {
                      setIsImportModalOpen(false);
                      setImportErrors([]);
                    }} className="text-slate-500 hover:text-white transition-colors">
                       <X className="w-6 h-6" />
                    </button>
                 </div>

                 {/* Error List - Enterprise Grade */}
                 {importErrors.length > 0 && (
                   <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl max-h-[150px] overflow-y-auto">
                      <p className="text-xs font-black text-rose-400 uppercase tracking-widest mb-2">Daftar Kesalahan Baris:</p>
                      <ul className="space-y-1">
                         {importErrors.map((err, i) => (
                           <li key={i} className="text-[11px] text-rose-300 font-medium leading-relaxed italic">â€¢ {err}</li>
                         ))}
                      </ul>
                   </div>
                 )}

                 <form onSubmit={handleImport} className="space-y-6">
                    <div className="space-y-4 p-4 bg-slate-950/50 border border-slate-800 rounded-2xl relative overflow-hidden">
                       <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl" />
                       <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div>
                             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1" /> Petunjuk Format Excel
                             </p>
                             <p className="text-[11px] text-slate-400 leading-relaxed max-w-sm">
                                Wajib memiliki kolom: <code className="text-indigo-300">No</code>, <code className="text-indigo-300">Segmen</code> (TWK/TIU/TKP), <code className="text-indigo-300">Teks Soal</code>, <code className="text-indigo-300">Opsi A-E</code>, dan <code className="text-indigo-300">Nilai A-E</code>.
                             </p>
                          </div>
                          <Button 
                             type="button" 
                             variant="outline" 
                             size="sm"
                             className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 flex-shrink-0"
                             onClick={() => window.open('/template_soal_cpns.xlsx', '_blank')}
                          >
                             <FileSpreadsheet className="w-4 h-4 mr-2" />
                             Unduh Template
                          </Button>
                       </div>
                    </div>

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

