'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, X } from 'lucide-react';

interface ReportCardPrintModalProps {
  reportCard: any | null;
  onClose: () => void;
}

export function ReportCardPrintModal({
  reportCard,
  onClose,
}: ReportCardPrintModalProps) {
  if (!reportCard) return null;

  const { tenant, student, term, exams, summary, attendance } = reportCard;
  const studentName = `${student.firstName} ${student.lastName}`;
  const primaryColor = tenant?.themeConfig?.primaryColor;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:bg-white print:p-0">
      <Card className="w-full max-w-3xl shadow-xl max-h-[92vh] overflow-y-auto print:shadow-none print:border-0 print:max-w-none print:max-h-none">
        <CardHeader className="flex flex-row items-center justify-between border-b print:hidden">
          <CardTitle className="text-lg">
            Academic Report Card — {studentName}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1.5" /> Print / Save PDF
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Header Branding */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b pb-4">
            <div>
              <h2
                className="text-2xl font-bold text-primary"
                style={primaryColor ? { color: primaryColor } : undefined}
              >
                {tenant?.name || 'Institute Management'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official Academic Transcript &amp; Report Card
              </p>
            </div>
            <div className="sm:text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Term / Period
              </div>
              <div className="text-base font-bold">{term}</div>
              <div className="mt-1">
                <Badge
                  variant={
                    summary.overallResult === 'PASS'
                      ? 'default'
                      : summary.overallResult === 'FAIL'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {summary.overallResult}
                </Badge>
              </div>
            </div>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
            <div>
              <div className="text-xs text-muted-foreground">Student Name</div>
              <div className="font-semibold">{studentName}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Student / Verify Code</div>
              <div className="font-mono font-semibold text-primary">
                {student.studentCode || student.id}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Course</div>
              <div className="font-medium">{student.courseName || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Batch</div>
              <div className="font-medium">{student.batchName || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Guardian</div>
              <div className="font-medium">{student.guardianName || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Attendance</div>
              <div className="font-medium">
                {attendance.presentClasses}/{attendance.totalClasses} (
                {attendance.attendancePercent}%)
              </div>
            </div>
          </div>

          {/* Exam Results Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left">
                  <th className="py-2.5 px-3 font-medium">Exam</th>
                  <th className="py-2.5 px-3 font-medium">Type</th>
                  <th className="py-2.5 px-3 font-medium text-right">Total</th>
                  <th className="py-2.5 px-3 font-medium text-right">Obtained</th>
                  <th className="py-2.5 px-3 font-medium text-right">%</th>
                  <th className="py-2.5 px-3 font-medium text-center">Grade</th>
                  <th className="py-2.5 px-3 font-medium text-right">GPA</th>
                  <th className="py-2.5 px-3 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {exams.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-muted-foreground">
                      No published exam results found for this term.
                    </td>
                  </tr>
                ) : (
                  exams.map((ex: any) => (
                    <tr key={ex.examId}>
                      <td className="py-2.5 px-3">
                        <div className="font-medium">{ex.examName}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(ex.date).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs">{ex.examType}</td>
                      <td className="py-2.5 px-3 text-right">{ex.totalMarks}</td>
                      <td className="py-2.5 px-3 text-right font-semibold">
                        {ex.isAbsent ? 'ABS' : ex.marksObtained}
                      </td>
                      <td className="py-2.5 px-3 text-right">{ex.percent}%</td>
                      <td className="py-2.5 px-3 text-center font-bold">{ex.grade}</td>
                      <td className="py-2.5 px-3 text-right">
                        {ex.gpaPoint !== null ? ex.gpaPoint.toFixed(2) : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <Badge variant={ex.passed ? 'default' : 'destructive'}>
                          {ex.isAbsent ? 'ABSENT' : ex.passed ? 'PASS' : 'FAIL'}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Total Marks</div>
              <div className="text-lg font-bold">
                {summary.totalObtained} / {summary.totalMarks}
              </div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Percentage</div>
              <div className="text-lg font-bold">{summary.overallPercent}%</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Average GPA</div>
              <div className="text-lg font-bold">{summary.averageGpa.toFixed(2)}</div>
            </div>
            <div className="border rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Attendance</div>
              <div className="text-lg font-bold">{attendance.attendancePercent}%</div>
            </div>
          </div>

          <div className="flex justify-between pt-8 text-xs text-muted-foreground">
            <div className="border-t pt-1 w-40 text-center">Class Instructor</div>
            <div className="border-t pt-1 w-40 text-center">Principal / Admin</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
