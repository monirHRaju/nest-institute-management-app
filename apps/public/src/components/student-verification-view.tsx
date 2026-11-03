'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ShieldCheck,
  Search,
  CheckCircle2,
  XCircle,
  Award,
  Calendar,
  GraduationCap,
  Loader2,
  AlertCircle,
  Building,
  Printer,
} from 'lucide-react';
import type { StudentVerificationResult } from '@repo/shared';
import { verifyStudentCredential } from '@/lib/client-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

export function StudentVerificationView() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get('studentId') || '';

  const [studentId, setStudentId] = useState(initialId);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<StudentVerificationResult | null>(null);

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg(null);

    if (!studentId.trim()) {
      setErrorMsg('Please enter a Student ID (e.g. STD-2026-0001).');
      return;
    }

    setLoading(true);
    try {
      const data = await verifyStudentCredential(studentId);
      setResult(data);
    } catch (err: any) {
      setResult(null);
      setErrorMsg(
        err.message || 'Verification failed. No matching official student record exists.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialId) {
      handleVerify();
    }
  }, []);

  const formatDate = (iso?: string | null) => {
    if (!iso) return 'N/A';
    try {
      return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Search Input Box */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-sm">
        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="stdId">Student ID Number</Label>
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                id="stdId"
                placeholder="e.g. STD-2026-0001"
                className="font-mono uppercase text-base"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
              />
              <Button
                type="submit"
                disabled={loading}
                className="gap-2 px-6 font-semibold shrink-0"
                style={{ backgroundColor: 'var(--tenant-primary)', color: 'white' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Verify Credential</span>
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Student IDs are issued upon official admission approval (format: STD-YYYY-XXXX).
            </p>
          </div>
        </form>

        {errorMsg && (
          <div className="mt-4 p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-3">
            <XCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <div>
              <h5 className="font-semibold">Unverified Credential</h5>
              <p className="mt-0.5 text-xs text-red-600">{errorMsg}</p>
            </div>
          </div>
        )}
      </div>

      {/* Verified Digital Credential Card */}
      {result && result.isVerified && (
        <Card className="border-emerald-200 shadow-lg bg-white overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Official Verification Header Ribbon */}
          <div className="bg-emerald-600 text-white px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-white" />
              <span className="font-bold text-sm tracking-wide uppercase">
                Official Credential Verification
              </span>
            </div>
            <Badge className="bg-white text-emerald-800 hover:bg-white text-xs font-bold">
              AUTHENTIC RECORD
            </Badge>
          </div>

          <CardHeader className="pt-6 pb-4 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
                  <GraduationCap className="w-7 h-7" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-extrabold text-gray-900">
                    {result.fullName}
                  </CardTitle>
                  <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-0.5">
                    <span>ID: {result.studentId}</span>
                    <span>•</span>
                    <span className="font-semibold text-emerald-700 uppercase">
                      Status: {result.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[11px] text-gray-500 uppercase tracking-wider block">
                  Institution
                </span>
                <span className="font-bold text-sm text-gray-800">{result.instituteName}</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* Enrollment Records Table */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-600" />
                Verified Program Enrollments
              </h4>

              {result.courses.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No course enrollment records found.</p>
              ) : (
                <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                  {result.courses.map((enr, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-slate-50/50 hover:bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-sm text-gray-900">
                          {enr.courseName}
                        </div>
                        {enr.batchName && (
                          <div className="text-gray-600">
                            Batch: <span className="font-medium">{enr.batchName}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-gray-500">
                          Enrolled: <span className="font-medium text-gray-700">{formatDate(enr.enrollmentDate)}</span>
                        </span>
                        <Badge
                          variant={enr.status === 'COMPLETED' ? 'success' : 'default'}
                          className="font-semibold text-[11px]"
                        >
                          {enr.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Verification Metadata Box */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-gray-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <span>Verification Timestamp: </span>
                <span className="font-medium text-gray-700 font-mono">
                  {new Date().toUTCString()}
                </span>
              </div>
              <div>
                <span>Digital Seal ID: </span>
                <span className="font-mono text-emerald-700 font-semibold">
                  SEC-VER-{result.studentId}
                </span>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50 border-t border-gray-100 py-3 px-6 flex justify-between items-center text-xs">
            <span className="text-gray-500">Official digital verification credential</span>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 text-blue-600 font-semibold hover:underline"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Credential Certificate</span>
            </button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
