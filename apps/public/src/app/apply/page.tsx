import React, { Suspense } from 'react';
import { GraduationCap, Sparkles, Loader2 } from 'lucide-react';
import { getTenantConfig, getPublicCourses } from '@/lib/server-api';
import { AdmissionApplyForm } from '@/components/admission-apply-form';

export const metadata = {
  title: 'Online Admission Application | EduManage',
  description: 'Submit your online admission application in minutes.',
};

export default async function PublicApplyPage() {
  const [config, courses] = await Promise.all([
    getTenantConfig(),
    getPublicCourses(),
  ]);

  const tenantName = config?.name || 'EduManage Institute';

  return (
    <div className="py-12 bg-slate-50/50 min-h-[calc(100vh-16rem)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Official Online Admissions Portal</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
            Apply for Admission at {tenantName}
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
            Fill out the form below to register for upcoming batches. Once submitted, you will receive an instant Tracking ID to monitor review progress.
          </p>
        </div>

        {/* Form Container with Suspense boundary */}
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl p-12 border border-gray-200 shadow-sm text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading admissions form...</p>
            </div>
          }
        >
          <AdmissionApplyForm courses={courses} />
        </Suspense>
      </div>
    </div>
  );
}
