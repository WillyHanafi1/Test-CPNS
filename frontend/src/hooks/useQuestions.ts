"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "react-hot-toast";
import { api } from "@/lib/api";
import type { AdminQuestion, AdminQuestionList } from "@/types/admin";

interface UseQuestionsOptions {
  initialPackageId?: string;
  initialSegment?: string;
  initialSearch?: string;
  initialMissingDiscussion?: boolean;
  pageSize?: number;
}

export function useQuestions(options: UseQuestionsOptions = {}) {
  const {
    initialPackageId = "",
    initialSegment = "",
    initialSearch = "",
    initialMissingDiscussion = false,
    pageSize = 15,
  } = options;

  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(initialSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch);
  const [selectedPackage, setSelectedPackage] = useState(initialPackageId);
  const [segment, setSegment] = useState(initialSegment);
  const [missingDiscussion, setMissingDiscussion] = useState(
    initialMissingDiscussion,
  );
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(
    new Set(),
  );
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchQuestions = useCallback(async () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        size: String(pageSize),
      });
      if (selectedPackage) params.set("package_id", selectedPackage);
      if (segment) params.set("segment", segment);
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (missingDiscussion) params.set("missing_discussion", "true");

      const data = await api<AdminQuestionList>(
        `/admin/questions?${params.toString()}`,
        { signal: controller.signal },
      );
      setQuestions(data.items);
      setTotal(data.total);
    } catch (err) {
      if (controller.signal.aborted) return;
      const msg =
        err instanceof Error ? err.message : "Gagal memuat daftar soal.";
      setError(msg);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [page, pageSize, selectedPackage, segment, debouncedSearch, missingDiscussion]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchQuestions();
    }, 0);
    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [fetchQuestions]);

  const deleteQuestion = useCallback(
    async (id: string | number): Promise<boolean> => {
      try {
        await api(`/admin/questions/${id}`, { method: "DELETE" });
        toast.success("Soal berhasil dihapus.");
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        await fetchQuestions();
        return true;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Gagal menghapus soal.",
        );
        return false;
      }
    },
    [fetchQuestions],
  );

  const bulkDeleteQuestions = useCallback(async (): Promise<boolean> => {
    if (selectedIds.size === 0) return false;
    const idsArray = Array.from(selectedIds);
    try {
      await api("/admin/questions/bulk", {
        method: "DELETE",
        body: JSON.stringify(idsArray),
      });
      toast.success(`${idsArray.length} soal berhasil dihapus.`);
      setSelectedIds(new Set());
      await fetchQuestions();
      return true;
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Gagal melakukan penghapusan massal.",
      );
      return false;
    }
  }, [selectedIds, fetchQuestions]);

  const toggleSelect = useCallback((id: string | number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(
    (allIds: (string | number)[]) => {
      setSelectedIds((prev) => {
        const allSelected =
          allIds.length > 0 && allIds.every((id) => prev.has(id));
        if (allSelected) return new Set();
        return new Set(allIds);
      });
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setSearch("");
    setDebouncedSearch("");
    setSelectedPackage("");
    setSegment("");
    setMissingDiscussion(false);
    setPage(1);
    setSelectedIds(new Set());
  }, []);

  return {
    questions,
    loading,
    error,
    total,
    page,
    pageSize,
    setPage,
    search,
    setSearch,
    selectedPackage,
    setSelectedPackage: (value: string) => {
      setSelectedPackage(value);
      setPage(1);
      setSelectedIds(new Set());
    },
    segment,
    setSegment: (value: string) => {
      setSegment(value);
      setPage(1);
    },
    missingDiscussion,
    setMissingDiscussion: (value: boolean) => {
      setMissingDiscussion(value);
      setPage(1);
    },
    selectedIds,
    setSelectedIds,
    fetchQuestions,
    deleteQuestion,
    bulkDeleteQuestions,
    toggleSelect,
    toggleSelectAll,
    resetFilters,
  };
}
