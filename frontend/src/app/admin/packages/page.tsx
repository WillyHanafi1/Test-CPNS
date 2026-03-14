"use client";

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit, 
  Package,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  X,
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function PackagesAdmin() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  
  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [message, setMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: 0,
    category: 'Mix',
    is_premium: false,
    is_published: false
  });

  useEffect(() => {
    fetchPackages();
  }, [page, category]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchPackages();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/admin/packages?page=${page}&size=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (category) url += `&category=${category}`;
      
      const response = await fetch(url, { 
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' 
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const data = await response.json();
      setPackages(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Fetch packages error:", error);
      setMessage({ type: 'error', text: 'Gagal mengambil data paket' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setSelectedPackage(null);
    setFormData({
      title: '',
      description: '',
      price: 0,
      category: 'Mix',
      is_premium: false,
      is_published: false
    });
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (pkg: any) => {
    setSelectedPackage(pkg);
    setFormData({
      title: pkg.title,
      description: pkg.description,
      price: pkg.price,
      category: pkg.category,
      is_premium: pkg.is_premium,
      is_published: pkg.is_published
    });
    setIsFormModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      const isEdit = !!selectedPackage;
      const url = isEdit 
        ? `${API_URL}/api/v1/admin/packages/${selectedPackage.id}`
        : `${API_URL}/api/v1/admin/packages`;
      
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: isEdit ? 'Paket berhasil diperbarui' : 'Paket baru berhasil dibuat' 
        });
        setIsFormModalOpen(false);
        fetchPackages();
      } else {
        const data = await response.json();
        setMessage({ type: 'error', text: data.detail || 'Terjadi kesalahan' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Gagal menghubungi server' });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedPackage) return;
    setFormLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/packages/${selectedPackage.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Paket berhasil dihapus' });
        setIsDeleteModalOpen(false);
        fetchPackages();
      } else {
        setMessage({ type: 'error', text: 'Gagal menghapus paket' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Terjadi kesalahan sistem' });
    } finally {
      setFormLoading(false);
    }
  };

  const columns: Column<any>[] = [
    { 
      header: 'Informasi Paket', 
      className: 'max-w-xs',
      render: (pkg) => (
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
             <Package className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <p className="font-bold text-slate-200">{pkg.title}</p>
              {pkg.is_published ? (
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" title="Published" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-slate-600" title="Draft" />
              )}
            </div>
            <p className="text-[10px] text-slate-500 truncate max-w-[150px]">{pkg.description}</p>
          </div>
        </div>
      )
    },
    { 
      header: 'Kategori', 
      render: (pkg) => (
        <Badge className={`rounded-xl py-1 px-3 font-bold text-[10px] border-none tracking-widest ${
          pkg.category === 'TWK' ? 'bg-blue-500/10 text-blue-400' :
          pkg.category === 'TIU' ? 'bg-indigo-500/10 text-indigo-400' :
          pkg.category === 'TKP' ? 'bg-orange-500/10 text-orange-400' :
          'bg-slate-500/10 text-slate-400'
        }`}>
          {pkg.category}
        </Badge>
      )
    },
    { 
      header: 'Harga', 
      render: (pkg) => (
        <span className="font-black text-slate-300">
          {pkg.price === 0 ? 'GRATIS' : `Rp ${pkg.price.toLocaleString('id-ID')}`}
        </span>
      )
    },
    { 
      header: 'Status', 
      render: (pkg) => (
        <Badge className={`rounded-full px-3 py-1 text-[9px] font-black tracking-tighter ${
          pkg.is_premium ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-800 text-slate-500'
        }`}>
          {pkg.is_premium ? 'PREMIUM' : 'REGULER'}
        </Badge>
      )
    },
    { 
      header: 'Jumlah Soal', 
      className: 'text-center',
      render: (pkg) => (
        <span className="font-bold text-slate-400">{pkg.question_count || 0} Soal</span>
      )
    },
    { 
      header: 'Aksi', 
      className: 'text-center',
      render: (pkg) => (
        <div className="flex items-center justify-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 rounded-xl hover:bg-slate-800 hover:text-white transition-all"
            onClick={() => handleOpenEdit(pkg)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 rounded-xl hover:bg-rose-500/10 hover:text-rose-400 transition-all"
            onClick={() => {
              setSelectedPackage(pkg);
              setIsDeleteModalOpen(true);
            }}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 pb-20">
      <AdminPageHeader 
        title="Paket Ujian" 
        subtitle={`Manajemen ${total} Paket Simulasi`}
        actions={
          <Button className="bg-indigo-600 hover:bg-indigo-700 rounded-2xl py-6 px-10 font-bold shadow-xl shadow-indigo-600/20" onClick={handleOpenCreate}>
            <Plus className="w-5 h-5 mr-2" />
            Buat Paket Baru
          </Button>
        }
      />

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
                placeholder="Cari judul paket..." 
                className="pl-12 bg-slate-950/50 border-slate-800/80 rounded-2xl py-7 font-medium md:text-lg focus:ring-indigo-500 focus:border-indigo-500 text-slate-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-3">
               <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl px-4 py-3 flex items-center min-w-[200px]">
                  <Filter className="w-4 h-4 text-slate-500 mr-2" />
                  <select 
                    className="bg-transparent text-sm font-bold text-slate-300 focus:outline-none w-full appearance-none pr-10"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Semua Kategori</option>
                    <option value="TWK">TWK</option>
                    <option value="TIU">TIU</option>
                    <option value="TKP">TKP</option>
                    <option value="Mix">Mix / Campuran</option>
                  </select>
               </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AdminDataTable 
        columns={columns}
        data={packages}
        loading={loading}
        emptyIcon={<Package className="w-12 h-12 text-slate-800" />}
        emptyText="Belum ada paket tersedia"
      />

      <AdminPagination 
        page={page}
        total={total}
        pageSize={10}
        onPageChange={setPage}
      />

      {/* Form Modal */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsFormModalOpen(false)} />
           <Card className="relative w-full max-w-xl bg-slate-900 border-slate-800 border-2 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8">
                 <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center space-x-3">
                       <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                          <Plus className="w-6 h-6 text-indigo-500" />
                       </div>
                       <div>
                          <h2 className="text-2xl font-black tracking-tight">{selectedPackage ? 'Edit Paket' : 'Buat Paket Baru'}</h2>
                          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Detail Informasi Paket</p>
                       </div>
                    </div>
                    <button onClick={() => setIsFormModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                       <X className="w-6 h-6" />
                    </button>
                 </div>

                 <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nama Paket</label>
                       <Input 
                         required
                         className="bg-slate-950 border-slate-800 rounded-2xl p-6 font-bold"
                         value={formData.title}
                         onChange={e => setFormData({...formData, title: e.target.value})}
                         placeholder="Contoh: Paket Tryout SKD 01"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Deskripsi Singkat</label>
                       <textarea 
                         required
                         className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm font-medium text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none min-h-[100px]"
                         value={formData.description}
                         onChange={e => setFormData({...formData, description: e.target.value})}
                         placeholder="Jelaskan isi paket ini..."
                       />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kategori</label>
                        <select 
                          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
                          value={formData.category}
                          onChange={e => setFormData({...formData, category: e.target.value})}
                        >
                          <option value="Mix">Mix</option>
                          <option value="TWK">TWK</option>
                          <option value="TIU">TIU</option>
                          <option value="TKP">TKP</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Harga (Rp)</label>
                        <Input 
                          type="number"
                          className="bg-slate-950 border-slate-800 rounded-2xl p-6 font-bold"
                          value={formData.price}
                          onChange={e => setFormData({...formData, price: parseInt(e.target.value) || 0})}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                       <div>
                          <p className="text-sm font-bold text-slate-200">Akses Premium</p>
                          <p className="text-[10px] text-slate-500">Kunci paket untuk pengguna berbayar</p>
                       </div>
                       <div className="relative inline-flex items-center cursor-pointer" onClick={() => setFormData({...formData, is_premium: !formData.is_premium})}>
                          <div className={`w-12 h-6 rounded-full transition-colors ${formData.is_premium ? 'bg-indigo-600' : 'bg-slate-800'}`}>
                             <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.is_premium ? 'translate-x-6' : ''}`} />
                          </div>
                       </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
                       <div>
                          <p className="text-sm font-bold text-slate-200">Publish Paket</p>
                          <p className="text-[10px] text-slate-500">Munculkan paket ini di katalog publik</p>
                       </div>
                       <div className="relative inline-flex items-center cursor-pointer" onClick={() => setFormData({...formData, is_published: !formData.is_published})}>
                          <div className={`w-12 h-6 rounded-full transition-colors ${formData.is_published ? 'bg-emerald-600' : 'bg-slate-800'}`}>
                             <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${formData.is_published ? 'translate-x-6' : ''}`} />
                          </div>
                       </div>
                    </div>

                    <div className="pt-4 flex space-x-3">
                       <Button 
                         type="button" 
                         variant="ghost" 
                         className="flex-1 py-7 rounded-2xl font-bold text-slate-400"
                         onClick={() => setIsFormModalOpen(false)}
                       >
                          Batal
                       </Button>
                       <Button 
                         type="submit" 
                         className="flex-[2] bg-indigo-600 hover:bg-indigo-700 py-7 rounded-2xl font-bold shadow-xl shadow-indigo-600/20"
                         disabled={formLoading}
                       >
                          {formLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : (selectedPackage ? <CheckCircle2 className="w-5 h-5 mr-2" /> : <Plus className="w-5 h-5 mr-2" />)}
                          {selectedPackage ? 'Update Paket' : 'Buat Paket'}
                       </Button>
                    </div>
                 </form>
              </div>
           </Card>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Paket?"
        description={`Apakah Anda yakin ingin menghapus paket "${selectedPackage?.title}"? Tindakan ini tidak dapat dibatalkan.`}
        variant="danger"
        loading={formLoading}
      />
    </div>
  );
}
