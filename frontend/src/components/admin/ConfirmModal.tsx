"use client";

import React from 'react';
import { X, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'danger',
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (variant) {
      case 'danger': return <AlertCircle className="w-6 h-6 text-rose-500" />;
      case 'warning': return <AlertTriangle className="w-6 h-6 text-amber-500" />;
      default: return <CheckCircle2 className="w-6 h-6 text-indigo-500" />;
    }
  };

  const getButtonStyle = () => {
    switch (variant) {
      case 'danger': return 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20';
      case 'warning': return 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20';
      default: return 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      <Card className="relative w-full max-w-md bg-slate-900 border-slate-800 border-2 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                variant === 'danger' ? 'bg-rose-500/10 border-rose-500/20' :
                variant === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                'bg-indigo-500/10 border-indigo-500/20'
              }`}>
                {getIcon()}
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight">{title}</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Konfirmasi Tindakan</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          <p className="text-slate-400 font-medium leading-relaxed mb-8">
            {description}
          </p>

          <div className="flex space-x-3">
            <Button
              type="button"
              variant="ghost"
              className="flex-1 py-7 rounded-2xl font-bold text-slate-400"
              onClick={onClose}
              disabled={loading}
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              className={`flex-1 py-7 rounded-2xl font-bold shadow-xl transition-all ${getButtonStyle()}`}
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : null}
              {confirmText}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
