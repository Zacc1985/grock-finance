'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  HomeIcon, 
  ChartBarIcon,
  MicrophoneIcon,
  CurrencyDollarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

export default function Navigation() {
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 w-full bg-gray-900 border-t border-gray-800 md:top-0 md:w-20 md:h-full md:border-r md:border-t-0">
      <div className="flex justify-around md:flex-col md:justify-start md:pt-8 md:space-y-8">
        <Link
          href="/"
          className={`p-4 flex flex-col items-center text-sm ${
            isActive('/') ? 'text-grock-500' : 'text-gray-400 hover:text-grock-400'
          }`}
        >
          <HomeIcon className="h-6 w-6" />
          <span className="mt-1 text-xs">Home</span>
        </Link>

        <Link
          href="/dashboard"
          className={`p-4 flex flex-col items-center text-sm ${
            isActive('/dashboard') ? 'text-grock-500' : 'text-gray-400 hover:text-grock-400'
          }`}
        >
          <ChartBarIcon className="h-6 w-6" />
          <span className="mt-1 text-xs">Dashboard</span>
        </Link>

        <Link
          href="/voice"
          className={`p-4 flex flex-col items-center text-sm ${
            isActive('/voice') ? 'text-grock-500' : 'text-gray-400 hover:text-grock-400'
          }`}
        >
          <MicrophoneIcon className="h-6 w-6" />
          <span className="mt-1 text-xs">Voice</span>
        </Link>

        <Link
          href="/goals"
          className={`p-4 flex flex-col items-center text-sm ${
            isActive('/goals') ? 'text-grock-500' : 'text-gray-400 hover:text-grock-400'
          }`}
        >
          <CurrencyDollarIcon className="h-6 w-6" />
          <span className="mt-1 text-xs">Goals</span>
        </Link>

        <Link
          href="/forecast"
          className={`p-4 flex flex-col items-center text-sm ${
            isActive('/forecast') ? 'text-grock-500' : 'text-gray-400 hover:text-grock-400'
          }`}
        >
          <CalendarIcon className="h-6 w-6" />
          <span className="mt-1 text-xs">Forecast</span>
        </Link>
      </div>
    </nav>
  );
} 