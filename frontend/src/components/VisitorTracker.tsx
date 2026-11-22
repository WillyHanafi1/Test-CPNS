"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { API_URL } from "@/lib/api";

const HEARTBEAT_MS = 120_000; // 2 minutes (online window on server is 5 minutes)

function sendVisitBeacon(path: string, heartbeat: boolean) {
  if (typeof window === "undefined" || !navigator.onLine) return;
  if (path === "/admin" || path.startsWith("/admin/") || path.startsWith("/api/")) {
    return;
  }
  void fetch(`${API_URL}/api/v1/public/visit`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, heartbeat }),
  }).catch(() => {
    // Silent by design: visitor telemetry must never interrupt user flows.
  });
}

export default function VisitorTracker() {
  const pathname = usePathname() || "/";
  const lastTrackRef = useRef<{ path: string; at: number } | null>(null);

  useEffect(() => {
    const now = Date.now();
    const prev = lastTrackRef.current;
    // Prevent duplicate hit from React StrictMode double-mount within 2s on the same route
    if (prev && prev.path === pathname && now - prev.at < 2000) {
      return;
    }
    lastTrackRef.current = { path: pathname, at: now };
    sendVisitBeacon(pathname, false);
  }, [pathname]);

  useEffect(() => {
    if (pathname === "/admin" || pathname.startsWith("/admin/")) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        sendVisitBeacon(pathname, true);
      }
    }, HEARTBEAT_MS);
    return () => window.clearInterval(timer);
  }, [pathname]);

  return null;
}
