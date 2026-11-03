import React from 'react';
import Link from 'next/link';
import { Mail, Phone, MapPin, GraduationCap, ShieldCheck } from 'lucide-react';
import type { TenantConfig } from '@/lib/server-api';

interface PublicFooterProps {
  config: TenantConfig | null;
}

export function PublicFooter({ config }: PublicFooterProps) {
  const currentYear = new Date().getFullYear();
  const name = config?.name || 'EduManage Institute';
  const theme = config?.themeConfig;

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Institute Brief */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                style={{ backgroundColor: 'var(--tenant-primary)' }}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">{name}</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              {theme?.aboutText ||
                'Empowering future leaders with top-tier education, specialized professional certifications, and industry-oriented training programs.'}
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                <ShieldCheck className="w-3.5 h-3.5" />
                Verified & Accredited Institution
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Academic Programs
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/courses" className="text-slate-400 hover:text-white transition-colors">
                  All Courses
                </Link>
              </li>
              <li>
                <Link href="/apply" className="text-slate-400 hover:text-white transition-colors">
                  Online Admission Application
                </Link>
              </li>
              <li>
                <Link href="/track" className="text-slate-400 hover:text-white transition-colors">
                  Track Application Status
                </Link>
              </li>
              <li>
                <Link href="/verify" className="text-slate-400 hover:text-white transition-colors">
                  Verify Student Credential
                </Link>
              </li>
            </ul>
          </div>

          {/* Student Support */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Student & Visitor Portal
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/contact" className="text-slate-400 hover:text-white transition-colors">
                  Contact Admissions
                </Link>
              </li>
              <li>
                <Link href="/track" className="text-slate-400 hover:text-white transition-colors">
                  Application Query Desk
                </Link>
              </li>
              <li>
                <a
                  href={process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3000'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  Admin / Staff Login
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wider uppercase mb-4">
              Campus Contact
            </h3>
            <ul className="space-y-3 text-sm text-slate-400">
              {theme?.address && (
                <li className="flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>{theme.address}</span>
                </li>
              )}
              {theme?.contactPhone && (
                <li className="flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <a href={`tel:${theme.contactPhone}`} className="hover:text-white transition-colors">
                    {theme.contactPhone}
                  </a>
                </li>
              )}
              {theme?.contactEmail && (
                <li className="flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <a href={`mailto:${theme.contactEmail}`} className="hover:text-white transition-colors">
                    {theme.contactEmail}
                  </a>
                </li>
              )}
              {!theme?.address && !theme?.contactPhone && !theme?.contactEmail && (
                <li className="text-slate-500 italic">Contact information will be updated soon.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>&copy; {currentYear} {name}. All rights reserved.</p>
          <p className="flex items-center gap-1.5">
            <span>Powered by</span>
            <span className="font-semibold text-slate-400">EduManage Institute Operating System</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
