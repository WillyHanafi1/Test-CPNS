"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, safeReturn } from "@/lib/api";
interface User {
  id: string;
  email: string;
  role: string;
  full_name?: string;
  is_pro?: boolean;
  pro_expires_at?: string | null;
}
interface Auth {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (
    email: string,
    password: string,
    fullName: string,
  ) => Promise<void>;
  refreshSession: () => Promise<void>;
}
const Context = createContext<Auth | undefined>(undefined);
function notifyOtherTabs() {
  try {
    localStorage.setItem("tocpns-auth-event", String(Date.now()));
  } catch {
    /* Session cookies still work when storage is blocked. */
  }
}
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const refreshSession = useCallback(async () => {
    try {
      const d = await api<User & { profile?: { full_name?: string } }>(
        "/auth/me",
      );
      setUser({ ...d, full_name: d.profile?.full_name });
    } catch (e) {
      if (e instanceof ApiError && [401, 403].includes(e.status)) setUser(null);
      throw e;
    }
  }, []);
  useEffect(() => {
    Promise.resolve()
      .then(refreshSession)
      .catch(() => {})
      .finally(() => setLoading(false));
    const handler = (e: StorageEvent) => {
      if (e.key === "tocpns-auth-event") refreshSession().catch(() => {});
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, [refreshSession]);
  const login = async (email: string, password: string) => {
    const data = new FormData();
    data.append("username", email);
    data.append("password", password);
    const body = await api<{ role: string }>("/auth/login", {
      method: "POST",
      body: data,
    });
    await refreshSession();
    notifyOtherTabs();
    router.replace(
      body.role === "admin"
        ? "/admin"
        : safeReturn(new URLSearchParams(window.location.search).get("next")),
    );
  };
  const logout = async () => {
    const { useExamStore } = await import("@/store/useExamStore");
    const state = useExamStore.getState();
    let tabKeys: string[] = [];
    try {
      tabKeys = Object.keys(localStorage).filter((k) =>
        k.startsWith("tocpns-exam-v2:"),
      );
    } catch {
      /* Use the in-memory pending state below. */
    }
    const otherPending = tabKeys.some((k) => {
      try {
        const saved = JSON.parse(localStorage.getItem(k) || "{}").state;
        return (
          saved?.ownerId === user?.id &&
          Object.keys(saved.pending || {}).length > 0
        );
      } catch {
        return false;
      }
    });
    if (
      (Object.keys(state.pending || {}).length || otherPending) &&
      !window.confirm(
        "Ada jawaban yang belum terkirim. Tetap keluar dan hapus antrean lokal?",
      )
    )
      return;
    await api("/auth/logout", { method: "POST" });
    useExamStore.getState().resetExam();
    tabKeys.forEach((k) => {
      try {
        if (
          JSON.parse(localStorage.getItem(k) || "{}").state?.ownerId ===
          user?.id
        )
          localStorage.removeItem(k);
      } catch {}
    });
    try {
      localStorage.removeItem("user_info");
    } catch {
      /* Optional legacy cache. */
    }
    setUser(null);
    notifyOtherTabs();
    router.push("/login");
  };
  const register = async (
    email: string,
    password: string,
    full_name: string,
  ) => {
    await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    });
  };
  return (
    <Context.Provider
      value={{ user, loading, login, logout, register, refreshSession }}
    >
      {children}
    </Context.Provider>
  );
}
export function useAuth() {
  const context = useContext(Context);
  if (!context) throw new Error("AuthProvider diperlukan.");
  return context;
}
