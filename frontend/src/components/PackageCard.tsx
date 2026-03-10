"use client";

import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Star } from 'lucide-react';

interface PackageProps {
  id: string;
  title: string;
  description: string;
  price: number;
  is_premium: boolean;
  category: string;
}

export function PackageCard({ id, title, description, price, is_premium, category }: PackageProps) {
  return (
    <Card className="flex flex-col h-full bg-slate-900/50 border-slate-800 hover:border-indigo-500/50 transition-all duration-300 group overflow-hidden">
      <CardHeader className="relative">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/20">
            {category}
          </Badge>
          {is_premium && (
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20">
              <Star className="w-3 h-3 mr-1 fill-current" /> Premium
            </Badge>
          )}
        </div>
        <CardTitle className="text-xl font-bold text-white group-hover:text-indigo-400 transition-colors">
          {title}
        </CardTitle>
        <CardDescription className="text-slate-400 line-clamp-2 mt-2">
          {description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow pt-0">
        <div className="flex items-center space-x-4 text-sm text-slate-500">
          <div className="flex items-center">
            <BookOpen className="w-4 h-4 mr-1.5 text-slate-600" />
            110 Soal
          </div>
          <div className="flex items-center">
            <Clock className="w-4 h-4 mr-1.5 text-slate-600" />
            100 Menit
          </div>
        </div>
      </CardContent>

      <CardFooter className="border-t border-slate-800/50 pt-4 bg-slate-900/30">
        <div className="flex items-center justify-between w-full">
          <div className="flex flex-col">
            <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Harga</span>
            <span className="text-lg font-bold text-white">
              {price === 0 ? 'Gratis' : `Rp ${price.toLocaleString('id-ID')}`}
            </span>
          </div>
          <Link href={`/catalog/${id}`}>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20">
              Lihat Detail
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}
