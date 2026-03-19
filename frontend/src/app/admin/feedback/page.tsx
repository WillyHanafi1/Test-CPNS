"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  MessageSquare, 
  Trash2, 
  X, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Filter,
  Search,
  MessageCircle,
  Bug,
  HelpCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  Shield,
  Flag,
  MoreVertical,
  CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AdminPageHeader, 
  AdminDataTable, 
  AdminPagination, 
  ConfirmModal,
  Column 
} from '@/components/admin';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export default function FeedbackAdmin() {
  const [feedbackList, setFeedbackList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    priority: ''
  });
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Edit Form State
  const [editForm, setEditForm] = useState({
    status: '',
    priority: '',
    admin_notes: ''
  });

  useEffect(() => {
    fetchFeedback();
  }, [page, filters]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/admin/feedback?page=${page}&size=10`;
      if (filters.category) url += `&category=${filters.category}`;
      if (filters.status) url += `&status=${filters.status}`;
      if (filters.priority) url += `&priority=${filters.priority}`;
      
      const response = await fetch(url, { 
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' 
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const data = await response.json();
      if (Array.isArray(data)) {
        setFeedbackList(data);
        setTotal(data.length); 
      } else {
        setFeedbackList(data.items || []);
        setTotal(data.total || 0);
      }
    } catch (error) {
      console.error("Fetch feedback error:", error);
      toast.error('Gagal mengambil data saran');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateFeedback = async () => {
    if (!selectedFeedback) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/feedback/${selectedFeedback.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Saran berhasil diperbarui');
        setIsEditModalOpen(false);
        fetchFeedback();
      } else {
        toast.error('Gagal memperbarui saran');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteFeedback = async () => {
    if (!selectedFeedback) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/feedback/${selectedFeedback.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Saran berhasil dihapus');
        setIsDeleteModalOpen(false);
        fetchFeedback();
      } else {
        toast.error('Gagal menghapus saran');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'resolved': return { color: 'bg-emerald-500/10 text-emerald-400', label: 'RESOLVED', icon: CheckCircle };
      case 'in_progress': return { color: 'bg-indigo-500/10 text-indigo-400', label: 'IN PROGRESS', icon: Clock };
      case 'reviewed': return { color: 'bg-blue-500/10 text-blue-400', label: 'REVIEWED', icon: Search };
      default: return { color: 'bg-slate-500/10 text-slate-400', label: 'PENDING', icon: AlertCircle };
    }
  };

  const getPriorityConfig = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent': return { color: 'bg-rose-500 text-white', label: 'URGENT' };
      case 'high': return { color: 'bg-orange-500/20 text-orange-400', label: 'HIGH' };
      case 'medium': return { color: 'bg-indigo-500/20 text-indigo-400', label: 'MEDIUM' };
      default: return { color: 'bg-slate-500/20 text-slate-400', label: 'LOW' };
    }
  };

  const columns: Column<any>[] = [
    { 
      header: 'Pengguna & Konteks', 
      className: 'w-[250px]',
      render: (f) => (
        <div className="flex flex-col space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400">
               {f.user?.email?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-200 truncate">{f.user?.email || 'Unknown'}</p>
              <p className="text-[10px] text-slate-500 font-medium">
                {new Date(f.created_at).toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}
              </p>
            </div>
          </div>
          {f.path_context && (
            <div className="flex items-center h-5 px-2 bg-slate-950/50 rounded-md border border-slate-800/50 w-fit">
              <ExternalLink className="w-2.5 h-2.5 text-slate-500 mr-1.5" />
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">{f.path_context}</span>
            </div>
          )}
        </div>
      )
    },
    { 
      header: 'Kategori', 
      className: 'w-32',
      render: (f) => {
        const cat = f.category?.toLowerCase();
        return (
          <div className="flex flex-col space-y-1.5">
            <Badge className={`rounded-lg py-1 px-2 font-bold text-[9px] border-none tracking-widest w-fit ${
              cat === 'bug' ? 'bg-rose-500/10 text-rose-400' :
              cat === 'correction' ? 'bg-emerald-500/10 text-emerald-400' :
              cat === 'suggestion' ? 'bg-indigo-500/10 text-indigo-400' :
              'bg-slate-500/10 text-slate-400'
            }`}>
              {f.category?.toUpperCase()}
            </Badge>
            <Badge className={`rounded-lg py-0.5 px-2 font-black text-[8px] border-none tracking-widest w-fit ${getPriorityConfig(f.priority).color}`}>
              {getPriorityConfig(f.priority).label}
            </Badge>
          </div>
        );
      }
    },
    { 
      header: 'Isi Pesan & Catatan', 
      className: 'min-w-[300px]',
      render: (f) => (
        <div className="space-y-2">
          <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/50">
            <p className="text-sm font-medium text-slate-300 leading-relaxed italic line-clamp-2">"{f.content}"</p>
          </div>
          {f.admin_notes && (
            <div className="flex items-start space-x-2 px-1">
              <Shield className="w-3 h-3 text-indigo-500 mt-0.5" />
              <p className="text-[11px] text-slate-500 font-medium italic line-clamp-1">Note: {f.admin_notes}</p>
            </div>
          )}
        </div>
      )
    },
    {
      header: 'Status',
      className: 'w-32',
      render: (f) => {
        const config = getStatusConfig(f.status);
        return (
          <Badge className={`rounded-xl py-1.5 px-3 font-black text-[10px] border-none tracking-[0.1em] ${config.color} flex items-center gap-1.5 w-fit`}>
            <config.icon className="w-3 h-3" />
            {config.label}
          </Badge>
        );
      }
    },
    { 
      header: 'Aksi', 
      className: 'text-center w-24',
      render: (f) => (
        <div className="flex items-center justify-center space-x-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-9 h-9 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-400 transition-all border border-transparent hover:border-indigo-500/20"
            onClick={() => {
              setSelectedFeedback(f);
              setEditForm({
                status: f.status,
                priority: f.priority,
                admin_notes: f.admin_notes || ''
              });
              setIsEditModalOpen(true);
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-9 h-9 rounded-xl hover:bg-rose-500/10 hover:text-rose-400 transition-all"
            onClick={() => {
              setSelectedFeedback(f);
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
        title="Saran & Kritik (Pro)" 
        subtitle="Manajemen feedback pelanggan dengan workflow profesional"
      />


      {/* Advanced Filters */}
      <Card className="bg-slate-900/60 border-slate-800/60 rounded-[2rem] overflow-hidden shadow-2xl backdrop-blur-md">
        <CardContent className="p-5 md:p-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Kategori</label>
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center">
                <Filter className="w-4 h-4 text-slate-500 mr-2" />
                <select 
                  className="bg-transparent text-sm font-bold text-slate-300 focus:outline-none w-full appearance-none"
                  value={filters.category}
                  onChange={(e) => {
                    setFilters({...filters, category: e.target.value});
                    setPage(1);
                  }}
                >
                  <option value="">Semua Kategori</option>
                  <option value="suggestion">Suggestion</option>
                  <option value="bug">Bug Report</option>
                  <option value="correction">Koreksi Soal</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Status</label>
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center text-emerald-400">
                <CheckCircle className="w-4 h-4 text-slate-500 mr-2" />
                <select 
                  className="bg-transparent text-sm font-bold text-slate-300 focus:outline-none w-full appearance-none"
                  value={filters.status}
                  onChange={(e) => {
                    setFilters({...filters, status: e.target.value});
                    setPage(1);
                  }}
                >
                  <option value="">Semua Status</option>
                  <option value="pending">Pending</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prioritas</label>
              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-2.5 flex items-center text-rose-400">
                <Flag className="w-4 h-4 text-slate-500 mr-2" />
                <select 
                  className="bg-transparent text-sm font-bold text-slate-300 focus:outline-none w-full appearance-none"
                  value={filters.priority}
                  onChange={(e) => {
                    setFilters({...filters, priority: e.target.value});
                    setPage(1);
                  }}
                >
                  <option value="">Semua Prioritas</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="pb-1.5 pl-2">
              <p className="text-[11px] font-bold text-slate-500">
                Ditemukan <span className="text-indigo-400">{total}</span> pesan masuk
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <AdminDataTable 
        columns={columns}
        data={feedbackList}
        loading={loading}
        emptyIcon={<MessageSquare className="w-16 h-16 text-slate-800" />}
        emptyText="Database saran masih kosong"
      />

      <AdminPagination 
        page={page}
        total={total}
        pageSize={10}
        onPageChange={setPage}
      />

      {/* Management Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <Card className="w-full max-w-lg bg-slate-900 border-slate-800 shadow-2xl rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <Shield className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight">Kelola Feedback</h3>
                  <p className="text-xs text-slate-500 font-medium">Update status dan berikan catatan internal</p>
                </div>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-500 hover:text-white transition-colors"
                disabled={actionLoading}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <CardContent className="p-6 space-y-6">
              <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800/50 space-y-2">
                <div className="flex justify-between items-center">
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Pesan User</p>
                   <Badge className="bg-indigo-600/10 text-indigo-400 border-none text-[8px]">{selectedFeedback?.category?.toUpperCase()}</Badge>
                </div>
                <p className="text-sm text-slate-300 italic">"{selectedFeedback?.content}"</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Set Status</label>
                  <select 
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none appearance-none"
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                  >
                    <option value="pending">Pending</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prioritas</label>
                  <select 
                    className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm font-bold text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none appearance-none"
                    value={editForm.priority}
                    onChange={(e) => setEditForm({...editForm, priority: e.target.value})}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Catatan Admin (Internal)</label>
                <textarea 
                  className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-300 min-h-[100px] focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none resize-none"
                  placeholder="Tuliskan catatan perbaikan atau progres untuk tim..."
                  value={editForm.admin_notes}
                  onChange={(e) => setEditForm({...editForm, admin_notes: e.target.value})}
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1 py-6 rounded-2xl border-slate-800 bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white font-bold"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={actionLoading}
                >
                  Batal
                </Button>
                <Button 
                  className="flex-1 py-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-xl shadow-indigo-600/20"
                  onClick={handleUpdateFeedback}
                  disabled={actionLoading}
                >
                  {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Simpan Perubahan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteFeedback}
        title="Hapus Saran?"
        description="Apakah Anda yakin ingin menghapus saran ini secara permanen?"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
}
