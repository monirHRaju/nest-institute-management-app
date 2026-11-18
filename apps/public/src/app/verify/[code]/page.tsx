import Link from 'next/link';
import { API_BASE_URL, resolveTenantSlug } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function VerifyStudentPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const slug = await resolveTenantSlug();

  let verifiedData: any = null;
  if (slug && code) {
    try {
      const res = await fetch(
        `${API_BASE_URL}/public/verify/student/${encodeURIComponent(code)}`,
        {
          headers: { 'x-tenant-slug': slug },
          cache: 'no-store',
        },
      );
      if (res.ok) {
        const json = await res.json();
        verifiedData = json?.data;
      }
    } catch {
      // handled below
    }
  }

  return (
    <div className="container mx-auto py-16 px-4">
      <Card className="max-w-lg mx-auto">
        <CardHeader className="border-b text-center">
          <CardTitle className="text-2xl">
            {verifiedData ? 'Official Student Verification' : 'Verification Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {!verifiedData ? (
            <div className="text-center space-y-4">
              <p className="text-muted-foreground text-sm">
                No verified student record matches code <strong>{code}</strong>.
              </p>
              <Button asChild variant="outline">
                <Link href="/results">Go to Results Lookup</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-center font-semibold">
                ✓ Verified Enrolled Student at {verifiedData.instituteName}
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <div className="text-xs text-muted-foreground">Student Name</div>
                  <div className="font-semibold">{verifiedData.studentName}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Student Code</div>
                  <div className="font-mono font-semibold">
                    {verifiedData.studentCode}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Course</div>
                  <div className="font-medium">
                    {verifiedData.courseName || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Batch</div>
                  <div className="font-medium">
                    {verifiedData.batchName || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Enrollment Status</div>
                  <div className="font-semibold">{verifiedData.status}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Enrolled Since</div>
                  <div className="font-medium">
                    {new Date(verifiedData.enrollmentDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
