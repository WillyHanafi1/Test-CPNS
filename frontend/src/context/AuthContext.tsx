"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, full_name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Validation: Check if we have a saved user info in localStorage
        const savedUser = localStorage.getItem('user_info');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          
          // Optional: Verify session with backend using credentials (cookie)
          const response = await fetch(`${API_URL}/api/v1/auth/me`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Important: send credentials (cookies)
          });

          if (response.ok) {
            setUser(userData);
          } else {
            // Token might be expired or invalid
            localStorage.removeItem('user_info');
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Auth check failed", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);

    const response = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      const userData = { id: data.user_id, email: data.email };
      setUser(userData);
      localStorage.setItem('user_info', JSON.stringify(userData));
      router.push('/dashboard');
    } else {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/v1/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error("Logout request failed", e);
    }
    setUser(null);
    localStorage.removeItem('user_info');
    router.push('/login');
  };

  const register = async (email: string, password: string, full_name: string) => {
    const response = await fetch(`${API_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, register, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
