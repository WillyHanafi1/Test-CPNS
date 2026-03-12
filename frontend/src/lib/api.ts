"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export const fetcher = (url: string) => fetch(`${API_URL}${url}`, { credentials: 'include' }).then(res => res.json());
