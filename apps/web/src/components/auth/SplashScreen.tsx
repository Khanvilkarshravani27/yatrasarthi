"use client";

import React from 'react';
import { Compass } from 'lucide-react';

export function SplashScreen() {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 text-center animate-fade-in"
      style={{ background: '#F5F2E8' }}
    >
      <div className="flex flex-col items-center max-w-sm mx-auto">
        {/* Modern Brand Logo */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-md transition-transform hover:scale-105"
          style={{ background: '#172017' }}
        >
          <Compass size={32} color="#C5D82D" strokeWidth={2.2} />
        </div>

        {/* Wordmark */}
        <h1
          className="font-extrabold text-3xl sm:text-4xl tracking-tight mb-3"
          style={{ color: '#172017', letterSpacing: '-0.03em' }}
        >
          YatraSarthi
        </h1>

        {/* Tagline */}
        <p
          className="text-sm sm:text-base font-medium leading-relaxed mb-10 max-w-xs"
          style={{ color: '#5F665B' }}
        >
          Your trip, still on track — no matter who broke it.
        </p>

        {/* Plain clean loading indicator (no text per spec) */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-full animate-bounce"
            style={{ background: '#172017', animationDelay: '0ms' }}
          />
          <div
            className="w-2.5 h-2.5 rounded-full animate-bounce"
            style={{ background: '#C5D82D', animationDelay: '150ms' }}
          />
          <div
            className="w-2.5 h-2.5 rounded-full animate-bounce"
            style={{ background: '#4E8752', animationDelay: '300ms' }}
          />
        </div>
      </div>
    </div>
  );
}
