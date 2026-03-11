"use client";

import React from 'react';

interface AdminPageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-4xl font-black tracking-tight mb-1">{title}</h1>
        {subtitle && (
          <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center space-x-3">
          {actions}
        </div>
      )}
    </div>
  );
}
