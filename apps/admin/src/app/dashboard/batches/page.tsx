'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ClipboardList, Users } from 'lucide-react';

export default function BatchesPage() {
  const { data: batches = [], isLoading } = useQuery({
    queryKey: ['batches'],
    queryFn: () => get<any[]>('/batches'),
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Batches</h1>
          <p className="text-sm text-muted-foreground">
            View active cohorts, enrolled student counts, and mark class
            attendance.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading batches...</p>
      ) : batches.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No batches found. Create batches under Courses &rarr; Manage.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.map((batch: any) => (
            <Card key={batch.id} className="flex flex-col justify-between">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {batch.course?.name || 'Course'}
                    </p>
                    <CardTitle className="text-lg mt-0.5">
                      {batch.name}
                    </CardTitle>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Users className="h-3 w-3" />
                    {batch._count?.students ?? 0}
                    {batch.capacity ? ` / ${batch.capacity}` : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>
                      Start:{' '}
                      {batch.startDate
                        ? new Date(batch.startDate).toLocaleDateString()
                        : 'TBA'}
                    </span>
                  </div>
                  {batch.schedule && <div>Schedule: {batch.schedule}</div>}
                </div>

                <Button asChild size="sm" className="w-full">
                  <Link href={`/dashboard/attendance?batchId=${batch.id}`}>
                    <ClipboardList className="h-4 w-4 mr-1.5" /> Mark Attendance
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
