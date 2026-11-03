'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
  Loader2,
  Calendar,
  Phone,
  User,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import type { AdmissionApplicationRecord } from '@repo/shared';
import { trackPublicApplication } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function ApplicationTrackerView() {
  const searchParams = useSearchParams();
  const initialAppNo = searchParams.get('applicationNumber') || '';
  const initialPhone = searchParams.get('phone') || '';

  const [applicationNumber, setApplicationNumber] = useState(initialAppNo);
  const [phone, setPhone] = useState(initialPhone);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [application, setApplication] = useState<AdmissionApplicationRecord | null>(null);

  const handleTrack = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!applicationNumber.trim()) {
      setErrorMsg('Please enter your Application Tracking ID (e.g. APP-2026-0001).');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Please enter the contact phone number used during application.');
      return;
    }

    setLoading(true);
    try {
      const data = await trackPublicApplication(applicationNumber, phone);
      setApplication(data);
    } catch (err: any) {
      setApplication(null);
      setErrorMsg(
        err.message || 'No application record found matching this ID and phone number. Please verify.'
      );
    } finally {
      setLoading(false);
    }
  };

  // If query parameters are present on initial mount, auto-trigger lookup
  useEffect(() => {
    if (initialAppNo && initialPhone) {
      handleTrack();
    }
  }, []);

  const formatDate = (iso?: string | null) => {
    if (!iso) return 'N/A';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge className="bg-emerald-600 text-white font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved & Admitted
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="destructive" className="font-semibold flex items-center gap-1">
            <XCircle className="w-3.5 h-3.5" />
            Application Rejected
          </Badge>
        );
      case 'PENDING':
      default:
        return (
          <Badge className="bg-amber-500 text-white font-semibold flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Under Committee Review
          </Badge>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Search Input Box */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm">
        <form onSubmit={handleTrack} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="appNo">Application ID</Label>
              <Input
                id="appNo"
                placeholder="e.g. APP-2026-0001"
                className="font-mono uppercase"
                value={applicationNumber}
                onChange={(e) => setApplicationNumber(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="appPhone">Applicant Phone Number</Label>
              <Input
                id="appPhone"
                type="tel"
                placeholder="e.g. +1 555-0199"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={loading}
              className="gap-2 px-6 font-semibold"
              style={{ backgroundColor: 'var(--tenant-primary)', color: 'white' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Checking Status...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Check Application Status</span>
                </>
              )}
            </Button>
          </div>
        </form>

        {errorMsg && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h5 className="font-semibold">Lookup Failed</h5>
              <p className="mt-0.5 text-xs text-red-600">{errorMsg}</p>
            </div>
          </div>
        )}
      </div>

      {/* Result Card */}
      {application && (
        <Card className="border-gray-200 shadow-md bg-white overflow-hidden animate-in fade-in-50 duration-200">
          <div
            className={`h-2 w-full ${
              application.status === 'APPROVED'
                ? 'bg-emerald-500'
                : application.status === 'REJECTED'
                ? 'bg-red-500'
                : 'bg-amber-500'
            }`}
          />
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-mono text-gray-500">Official Tracking Reference</span>
                <CardTitle className="text-2xl font-mono font-extrabold text-gray-900 mt-0.5">
                  {application.applicationNumber}
                </CardTitle>
              </div>
              <div>{getStatusBadge(application.status)}</div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Status explanation alert */}
            {application.status === 'APPROVED' && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Congratulations! Your application has been approved.</span>
                </div>
                <p>
                  You have been officially accepted into the program. Your enrollment record and student profile have been created.
                </p>
                {(application.studentId || application.student?.studentId) && (
                  <div className="pt-2 flex items-center gap-2 font-mono text-xs">
                    <span className="font-semibold">Your Official Student ID:</span>
                    <span className="px-2.5 py-1 bg-white rounded border border-emerald-300 font-bold text-emerald-950">
                      {application.studentId || application.student?.studentId}
                    </span>
                  </div>
                )}
              </div>
            )}

            {application.status === 'PENDING' && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm space-y-1">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Application Under Evaluation</span>
                </div>
                <p>
                  Our admissions committee is currently evaluating your credentials and batch availability. You will be contacted via email or phone if additional verification is needed.
                </p>
              </div>
            )}

            {application.status === 'REJECTED' && (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm space-y-1">
                <div className="flex items-center gap-2 font-bold text-red-900">
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span>Application Status Update</span>
                </div>
                <p>
                  We regret to inform you that we are unable to accept your application for this intake. Please contact admissions for reconsideration or alternative programs.
                </p>
              </div>
            )}

            {/* Application Data Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-gray-500 block mb-1">Applicant Name</span>
                <span className="font-semibold text-sm text-gray-900">
                  {application.firstName} {application.lastName}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-gray-500 block mb-1">Contact Email</span>
                <span className="font-semibold text-sm text-gray-900">{application.email || 'N/A'}</span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-gray-500 block mb-1">Course Applied</span>
                <span className="font-semibold text-sm text-gray-900">
                  {application.course?.name || 'Assigned Course'}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-gray-500 block mb-1">Assigned Batch</span>
                <span className="font-semibold text-sm text-gray-900">
                  {application.batch?.name || 'General / Rolling Intake'}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-gray-500 block mb-1">Submission Date</span>
                <span className="font-medium text-gray-800">
                  {formatDate(application.createdAt)}
                </span>
              </div>

              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-gray-500 block mb-1">Last Status Update</span>
                <span className="font-medium text-gray-800">
                  {formatDate(application.reviewedAt || application.updatedAt)}
                </span>
              </div>
            </div>

            {/* Notes if present */}
            {application.notes && (
              <div className="text-xs p-3.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-gray-500 block font-semibold mb-1">Applicant Notes:</span>
                <p className="text-gray-700 italic">{application.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
