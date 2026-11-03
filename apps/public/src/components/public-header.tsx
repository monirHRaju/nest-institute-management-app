'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, GraduationCap, ShieldCheck, Search, PhoneCall, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PublicHeaderProps {
  tenantName: string;
  logoUrl?: string;
  adminUrl?: string;
}

export function PublicHeader({ tenantName, logoUrl, adminUrl = 'http://localhost:3000' }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/courses', label: 'Courses' },
    { href: '/apply', label: 'Apply Online', highlight: true },
    { href: '/track', label: 'Track Status' },
    { href: '/verify', label: 'Verify Student' },
    { href: '/contact', label: 'Contact' },
  ];

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo / Brand Name */}
          <Link href="/" className="flex items-center gap-3 group">
            {logoUrl ? (
              <img src={logoUrl} alt={tenantName} className="h-10 w-auto object-contain rounded" />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm font-bold text-xl group-hover:scale-105 transition-transform"
                style={{ backgroundColor: 'var(--tenant-primary)' }}
              >
                <GraduationCap className="w-6 h-6" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-bold text-lg leading-tight text-gray-900 group-hover:text-blue-600 transition-colors">
                {tenantName}
              </span>
              <span className="text-[11px] text-gray-500 font-medium">Public Portal</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              if (link.highlight) {
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="ml-2 inline-flex items-center px-4 py-2 rounded-md text-sm font-semibold text-white shadow-sm transition-all hover:opacity-90 active:scale-95"
                    style={{ backgroundColor: 'var(--tenant-primary)' }}
                  >
                    {link.label}
                  </Link>
                );
              }
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? 'text-blue-600 bg-blue-50/60 font-semibold'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}

            <div className="h-5 w-px bg-gray-200 mx-2" />

            {/* Portal Login Link */}
            <a
              href={adminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
            >
              <span>Portal Login</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          </nav>

          {/* Mobile menu button */}
          <div className="flex lg:hidden items-center gap-2">
            <Link
              href="/apply"
              className="text-xs px-3 py-1.5 rounded text-white font-medium shadow-sm"
              style={{ backgroundColor: 'var(--tenant-primary)' }}
            >
              Apply
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg animate-in slide-in-from-top-2">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2.5 rounded-md text-base font-medium ${
                isActive(link.href)
                  ? 'text-blue-600 bg-blue-50 font-semibold'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100 mt-2">
            <a
              href={adminUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between px-3 py-2.5 rounded-md text-base font-medium text-gray-600 hover:bg-gray-50"
            >
              <span>Staff & Student Portal Login</span>
              <ExternalLink className="w-4 h-4 text-gray-400" />
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
