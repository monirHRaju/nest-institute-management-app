import React, { Suspense } from 'react';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { StudentVerificationView } from '@/components/student-verification-view';

export const metadata = {
  title: 'Public Student Verification & Credential Registry | EduManage',
  description: 'Verify official student enrollment and credential records.',
};

export default function PublicVerifyPage() {
  return (
    <div className="py-12 bg-slate-50/50 min-h-[calc(100vh-16rem)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Digital Credential Registry</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
            Verify Student Credentials
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
            Employers, academic institutions, and students can authenticate official enrollment status and academic completion records directly against our registry.
          </p>
        </div>

        {/* Verification Container */}
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl p-12 border border-gray-200 shadow-sm text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading credential registry...</p>
            </div>
          }
        >
          <StudentVerificationView />
        </Suspense>
      </div>
    </div>
  );
}
