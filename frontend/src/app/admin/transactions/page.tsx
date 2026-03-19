"use client";

import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Search, 
  Filter, 
  CreditCard,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Clock,
  Ban,
  TrendingUp,
  Package as PackageIcon,
  User as UserIcon,
  Crown
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

export default function TransactionsAdmin() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [packageFilter, setPackageFilter] = useState('');
  
  // Modals state
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPackages();
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [page, statusFilter, packageFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page !== 1) setPage(1);
      else fetchTransactions();
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPackages = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/packages`, { credentials: 'include' });
      const data = await response.json();
      setPackages(data.items || []);
    } catch (error) {
      console.error("Fetch packages error:", error);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/transactions/summary`, { credentials: 'include' });
      const data = await response.json();
      setSummary(data);
    } catch (error) {
      console.error("Fetch summary error:", error);
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/admin/transactions?page=${page}&size=10`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (packageFilter) url += `&package_id=${packageFilter}`;
      
      const response = await fetch(url, { 
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include' 
      });
      if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
      
      const data = await response.json();
      setTransactions(data.items);
      setTotal(data.total);
    } catch (error) {
      console.error("Fetch transactions error:", error);
      toast.error('Gagal mengambil data transaksi');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTransaction) return;
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/v1/admin/transactions/${selectedTransaction.id}/status?new_status=${newStatus}`, {
        method: 'PUT',
        credentials: 'include'
      });

      if (response.ok) {
        toast.success('Status transaksi diperbarui');
        setIsStatusModalOpen(false);
        fetchTransactions();
        fetchSummary();
      } else {
        toast.error('Gagal update status');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem');
    } finally {
      setActionLoading(false);
    }
  };

  const columns: Column<any>[] = [
    { 
      header: 'Order ID / Tanggal', 
      render: (t) => (
        <div>
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-tighter">ORDER: {t.order_id || t.id.substring(0, 8)}</p>
          <p className="text-xs font-bold text-slate-300">
            {new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      )
    },
    { 
      header: 'Pengguna', 
      render: (t) => (
        <div className="flex items-center space-x-2">
           <UserIcon className="w-4 h-4 text-slate-500" />
           <p className="text-sm font-medium text-slate-200">{t.user.email}</p>
        </div>
      )
    },
    { 
      header: 'Paket / Type', 
      render: (t) => (
        <div className="flex items-center space-x-2">
           {t.transaction_type === 'pro_upgrade' ? (
             <>
               <Crown className="w-4 h-4 text-amber-500" />
               <p className="text-sm font-bold text-amber-500">PRO ACCOUNT</p>
             </>
           ) : (
             <>
               <PackageIcon className="w-4 h-4 text-indigo-400" />
               <p className="text-sm font-bold text-slate-300">{t.package?.title}</p>
             </>
           )}
        </div>
      )
    },
    { 
      header: 'Amount', 
      render: (t) => (
        <span className="font-black text-slate-200">Rp {t.amount.toLocaleString('id-ID')}</span>
      )
    },
    { 
      header: 'Status', 
      render: (t) => (
        <Badge className={`rounded-full px-3 py-1 text-[9px] font-black tracking-tighter ${
          t.payment_status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 
          t.payment_status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 
          'bg-rose-500/10 text-rose-500'
        }`}>
          {t.payment_status.toUpperCase()}
        </Badge>
      )
    },
    { 
      header: 'Aksi', 
      className: 'text-center',
      render: (t) => (
        <div className="flex items-center justify-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 rounded-xl hover:bg-slate-800 hover:text-white"
            onClick={() => {
              setSelectedTransaction(t);
              setIsDetailModalOpen(true);
            }}
          >
            <CreditCard className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="w-10 h-10 rounded-xl hover:bg-slate-800 hover:text-white"
            onClick={() => {
              setSelectedTransaction(t);
              setIsStatusModalOpen(true);
            }}
          >
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 pb-20">
      <AdminPageHeader 
        title="Riwayat Transaksi" 
        subtitle="Pantau pendapatan dan akses pengguna"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
         <Card className="bg-slate-900/40 border-slate-800/60 rounded-3xl p-6">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Revenue</p>
            <div className="flex items-center justify-between">
               <h3 className="text-2xl font-black text-emerald-400">Rp {summary?.total_revenue.toLocaleString('id-ID') || '0'}</h3>
               <TrendingUp className="w-5 h-5 text-emerald-500 opacity-50" />
            </div>
         </Card>
         <Card className="bg-slate-900/40 border-slate-800/60 rounded-3xl p-6">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Success Orders</p>
            <div className="flex items-center justify-between">
               <h3 className="text-2xl font-black text-slate-200">{summary?.success_count || '0'}</h3>
               <CheckCircle2 className="w-5 h-5 text-emerald-500 opacity-50" />
            </div>
         </Card>
         <Card className="bg-slate-900/40 border-slate-800/60 rounded-3xl p-6">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Pending Orders</p>
            <div className="flex items-center justify-between">
               <h3 className="text-2xl font-black text-slate-200">{summary?.pending_count || '0'}</h3>
               <Clock className="w-5 h-5 text-amber-500 opacity-50" />
            </div>
         </Card>
         <Card className="bg-slate-900/40 border-slate-800/60 rounded-3xl p-6">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Failed Orders</p>
            <div className="flex items-center justify-between">
               <h3 className="text-2xl font-black text-slate-200">{summary?.failed_count || '0'}</h3>
               <Ban className="w-5 h-5 text-rose-500 opacity-50" />
            </div>
         </Card>
      </div>


      {/* Filters & Search */}
      <Card className="bg-slate-900/40 border-slate-800/60 rounded-[2rem] overflow-hidden">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
              <Input 
                placeholder="Cari user email..." 
                className="pl-12 bg-slate-950/50 border-slate-800/80 rounded-2xl py-7 font-medium md:text-lg focus:ring-indigo-500 focus:border-indigo-500 text-slate-200"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center space-x-3">
               <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl px-4 py-3 flex items-center min-w-[150px]">
                  <Filter className="w-4 h-4 text-slate-500 mr-2" />
                  <select 
                    className="bg-transparent text-sm font-bold text-slate-300 focus:outline-none w-full appearance-none pr-10"
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="">Semua Status</option>
                    <option value="success">Success</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
               </div>
               <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl px-4 py-3 flex items-center min-w-[150px]">
                  <PackageIcon className="w-4 h-4 text-slate-500 mr-2" />
                  <select 
                    className="bg-transparent text-sm font-bold text-slate-300 focus:outline-none w-full appearance-none pr-10"
                    value={packageFilter}
                    onChange={(e) => {
                      setPackageFilter(e.target.value);
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
        data={transactions}
        loading={loading}
        emptyIcon={<CreditCard className="w-12 h-12 text-slate-800" />}
        emptyText="Belum ada transaksi ditemukan"
      />

      <AdminPagination 
        page={page}
        total={total}
        pageSize={10}
        onPageChange={setPage}
      />

      {/* Detail Modal */}
      {isDetailModalOpen && selectedTransaction && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsDetailModalOpen(false)} />
            <Card className="relative w-full max-w-lg bg-slate-900 border-slate-800 border-2 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
               <div className="p-8">
                  <div className="flex items-center justify-between mb-8">
                     <h2 className="text-2xl font-black tracking-tight">Detail Transaksi</h2>
                     <button onClick={() => setIsDetailModalOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                     </button>
                  </div>
                  
                  <div className="space-y-6">
                      <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 space-y-4">
                         <div className="flex justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Transaction ID</span>
                            <span className="text-xs font-mono text-slate-300">{selectedTransaction.id}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Snap Token</span>
                            <span className="text-xs font-mono text-indigo-400">{selectedTransaction.snap_token || 'N/A'}</span>
                         </div>
                         <div className="flex justify-between border-t border-slate-800/50 pt-4">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Type</span>
                            <Badge variant="outline" className="text-[10px] uppercase font-black">{selectedTransaction.transaction_type.replace('_', ' ')}</Badge>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">User Email</span>
                            <span className="text-sm font-bold text-slate-200">{selectedTransaction.user.email}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Paket</span>
                            <span className="text-sm font-bold text-slate-200">{selectedTransaction.package?.title || 'GLOBAL PRO'}</span>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Status</span>
                            <Badge className={`rounded-xl py-0.5 px-3 font-black text-[9px] ${
                               selectedTransaction.payment_status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 
                               selectedTransaction.payment_status === 'pending' ? 'bg-amber-500/10 text-amber-500' : 
                               'bg-rose-500/10 text-rose-500'
                            }`}>{selectedTransaction.payment_status.toUpperCase()}</Badge>
                         </div>
                         <div className="flex justify-between">
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Expires At</span>
                            <span className="text-sm font-bold text-slate-400">
                               {selectedTransaction.access_expires_at ? new Date(selectedTransaction.access_expires_at).toLocaleDateString() : 'N/A'}
                            </span>
                         </div>
                      </div>

                      <div className="flex space-x-3 pt-2">
                         <Button className="flex-1 py-7 rounded-2xl bg-slate-800 hover:bg-slate-700 font-bold" onClick={() => setIsDetailModalOpen(false)}>
                            Tutup
                         </Button>
                      </div>
                  </div>
               </div>
            </Card>
         </div>
      )}

      {/* Status Override Modal */}
      {isStatusModalOpen && selectedTransaction && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setIsStatusModalOpen(false)} />
            <Card className="relative w-full max-w-sm bg-slate-900 border-slate-800 border-2 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
               <div className="p-8">
                  <div className="flex items-center space-x-3 mb-6">
                      <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20">
                        <TrendingUp className="w-6 h-6 text-amber-500" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-black tracking-tight">Ubah Status</h2>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Override Payment Status</p>
                      </div>
                  </div>

                  <div className="space-y-3">
                     <Button 
                       className={`w-full py-8 rounded-2xl font-black transition-all ${selectedTransaction.payment_status === 'success' ? 'bg-emerald-600' : 'bg-slate-800'}`}
                       onClick={() => handleUpdateStatus('success')}
                       disabled={actionLoading}
                     >
                        SET SUCCESS
                     </Button>
                     <Button 
                       className={`w-full py-8 rounded-2xl font-black transition-all ${selectedTransaction.payment_status === 'pending' ? 'bg-amber-600' : 'bg-slate-800'}`}
                       onClick={() => handleUpdateStatus('pending')}
                       disabled={actionLoading}
                     >
                        SET PENDING
                     </Button>
                     <Button 
                       className={`w-full py-8 rounded-2xl font-black transition-all ${selectedTransaction.payment_status === 'failed' ? 'bg-rose-600' : 'bg-slate-800'}`}
                       onClick={() => handleUpdateStatus('failed')}
                       disabled={actionLoading}
                     >
                        SET FAILED
                     </Button>
                  </div>
                  
                  <Button variant="ghost" className="w-full mt-4 py-6 rounded-2xl font-bold text-slate-500" onClick={() => setIsStatusModalOpen(false)}>
                    Batal
                  </Button>
               </div>
            </Card>
         </div>
      )}
    </div>
  );
}
