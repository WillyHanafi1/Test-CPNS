"use client";

import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export function useQuestions() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/admin/questions?page=${page}&size=10`;
      if (selectedPackage) url += `&package_id=${selectedPackage}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;

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
      setMessage({ type: 'error', text: 'Gagal memuat daftar soal' });
    } finally {
      setLoading(false);
    }
  }, [page, selectedPackage, search]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchQuestions();
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [fetchQuestions]);

  const deleteQuestion = async (id: string | number) => {
    const previousQuestions = [...questions];
    const previousTotal = total;

    // Optimistic Update
    setQuestions(prev => prev.filter(q => q.id !== id));
    setTotal(prev => prev - 1);

    try {
      const response = await fetch(`${API_URL}/api/v1/admin/questions/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Delete failed");
      setMessage({ type: 'success', text: 'Soal berhasil dihapus' });
    } catch (error) {
      setQuestions(previousQuestions);
      setTotal(previousTotal);
      setMessage({ type: 'error', text: 'Gagal menghapus soal' });
    }
  };

  const bulkDeleteQuestions = async () => {
    if (selectedIds.size === 0) return;

    const idsArray = Array.from(selectedIds);
    const previousQuestions = [...questions];
    const previousTotal = total;

    // Optimistic Update
    setQuestions(prev => prev.filter(q => !selectedIds.has(q.id)));
    setTotal(prev => prev - idsArray.length);
    setSelectedIds(new Set());

    try {
      const response = await fetch(`${API_URL}/api/v1/admin/questions/bulk`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(idsArray),
        credentials: 'include'
      });

      if (!response.ok) throw new Error("Bulk delete failed");
      setMessage({ type: 'success', text: `${idsArray.length} soal berhasil dihapus` });
    } catch (error) {
      setQuestions(previousQuestions);
      setTotal(previousTotal);
      setMessage({ type: 'error', text: 'Gagal melakukan penghapusan massal' });
    }
  };

  const toggleSelect = (id: string | number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = (allIds: (string | number)[]) => {
    if (selectedIds.size === questions.length && questions.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allIds));
    }
  };

  return {
    questions,
    loading,
    total,
    page,
    setPage,
    search,
    setSearch,
    selectedPackage,
    setSelectedPackage,
    message,
    setMessage,
    selectedIds,
    setSelectedIds,
    fetchQuestions,
    deleteQuestion,
    bulkDeleteQuestions,
    toggleSelect,
    toggleSelectAll
  };
}
