import React, { Suspense } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { ApplicationTrackerView } from '@/components/application-tracker-view';

export const metadata = {
  title: 'Track Admission Application | EduManage',
  description: 'Check the real-time status of your online admission application.',
};

export default function PublicTrackPage() {
  return (
    <div className="py-12 bg-slate-50/50 min-h-[calc(100vh-16rem)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Search className="w-3.5 h-3.5 text-blue-600" />
            <span>Application Status Lookup</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-950 tracking-tight">
            Track Your Admission Status
          </h1>
          <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
            Enter your Application ID (e.g. APP-2026-0001) and your contact phone number to view the current review status and counselor updates.
          </p>
        </div>

        {/* Search & Status Container */}
        <Suspense
          fallback={
            <div className="bg-white rounded-2xl p-12 border border-gray-200 shadow-sm text-center">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading tracker...</p>
            </div>
          }
        >
          <ApplicationTrackerView />
        </Suspense>
      </div>
    </div>
  );
}
