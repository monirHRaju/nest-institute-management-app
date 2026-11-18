'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ResultsLookupProps {
  tenantSlug: string;
  tenantName: string;
  apiBaseUrl: string;
}

export function ResultsLookup({
  tenantSlug,
  tenantName,
  apiBaseUrl,
}: ResultsLookupProps) {
  const [identifier, setIdentifier] = useState('');
  const [phone, setPhone] = useState('');
  const [term, setTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultData(null);
    setLoading(true);

    try {
      const res = await fetch(`${apiBaseUrl}/public/results/lookup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug,
        },
        body: JSON.stringify({
          identifier: identifier.trim(),
          phone: phone.trim(),
          term: term.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          json?.message ||
          'No matching student or published results found for the provided details.';
        setError(Array.isArray(msg) ? msg.join(', ') : msg);
      } else {
        setResultData(json?.data);
      }
    } catch {
      setError('Unable to reach server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="max-w-xl mx-auto print:hidden">
        <CardHeader>
          <CardTitle>Check Published Exam Results</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Student Code or Student ID *
              </label>
              <input
                required
                placeholder="e.g. STU-2026-0001"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full h-10 rounded-md border px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Registered Phone (or Last 4 Digits) *
              </label>
              <input
                required
                placeholder="e.g. 017XXXXXXXX or last 4 digits"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 rounded-md border px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                Term / Session (optional)
              </label>
              <input
                placeholder="e.g. Spring 2026"
                value={term}
                onChange={(e) => setTerm(e.target.value)}
                className="w-full h-10 rounded-md border px-3 text-sm"
              />
            </div>
            {error && (
              <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm border border-red-200">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Searching...' : 'Find My Results'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {resultData && (
        <Card className="max-w-3xl mx-auto">
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle className="text-xl">{tenantName} — Transcript</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Student Code: <strong>{resultData.student.studentCode}</strong>
              </p>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/verify/${resultData.student.studentCode}`}>
                  Verify Link
                </Link>
              </Button>
              <Button size="sm" onClick={() => window.print()}>
                Print / Save PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
              <div>
                <div className="text-xs text-muted-foreground">Student Name</div>
                <div className="font-semibold">
                  {resultData.student.firstName} {resultData.student.lastName}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Course</div>
                <div className="font-medium">
                  {resultData.student.courseName || '—'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Batch</div>
                <div className="font-medium">
                  {resultData.student.batchName || '—'}
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="py-2.5 px-3">Exam</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Marks</th>
                    <th className="py-2.5 px-3 text-right">%</th>
                    <th className="py-2.5 px-3 text-center">Grade</th>
                    <th className="py-2.5 px-3 text-right">GPA</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {resultData.exams.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-6 text-center text-muted-foreground"
                      >
                        No published exam results found yet.
                      </td>
                    </tr>
                  ) : (
                    resultData.exams.map((ex: any) => (
                      <tr key={ex.examId}>
                        <td className="py-2.5 px-3 font-medium">{ex.examName}</td>
                        <td className="py-2.5 px-3 text-xs">{ex.examType}</td>
                        <td className="py-2.5 px-3 text-right font-semibold">
                          {ex.isAbsent
                            ? 'ABS'
                            : `${ex.marksObtained} / ${ex.totalMarks}`}
                        </td>
                        <td className="py-2.5 px-3 text-right">{ex.percent}%</td>
                        <td className="py-2.5 px-3 text-center font-bold">
                          {ex.grade}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {ex.gpaPoint !== null ? ex.gpaPoint.toFixed(2) : '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Total Marks</div>
                <div className="text-lg font-bold">
                  {resultData.summary.totalObtained} /{' '}
                  {resultData.summary.totalMarks}
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Average GPA</div>
                <div className="text-lg font-bold">
                  {resultData.summary.averageGpa.toFixed(2)}
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <div className="text-xs text-muted-foreground">Result</div>
                <div className="text-lg font-bold">
                  {resultData.summary.overallResult}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
