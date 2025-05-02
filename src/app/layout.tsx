import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navigation from '../components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Grock Finance',
  description: 'AI-powered personal finance management with Grock theme',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex md:flex-row">
          <Navigation />
          <main className="flex-1 md:ml-20">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
} 