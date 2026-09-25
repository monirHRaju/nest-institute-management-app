'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, patch, post, del } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({ name: '', duration: '', fees: 0, categoryId: '' });
  const [batchData, setBatchData] = useState({ name: '', startDate: '', capacity: 0 });

  const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: () => get<any[]>('/categories') });
  
  const { data: course, isLoading } = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => get<any>(`/courses/` + courseId),
  });

  useEffect(() => {
    if (course) {
      setFormData({
        name: course.name,
        duration: course.duration || '',
        fees: course.fees,
        categoryId: course.categoryId || '',
      });
    }
  }, [course]);

  const updateMutation = useMutation({
    mutationFn: (data: any) => patch(`/courses/` + courseId, data),
    onSuccess: () => {
      toast.success('Course updated');
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });

  const createBatchMutation = useMutation({
    mutationFn: (data: any) => post('/batches', data),
    onSuccess: () => {
      toast.success('Batch created');
      setBatchData({ name: '', startDate: '', capacity: 0 });
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: (batchId: string) => del(`/batches/` + batchId),
    onSuccess: () => {
      toast.success('Batch deleted');
      queryClient.invalidateQueries({ queryKey: ['course', courseId] });
    },
  });

  if (isLoading) return <p>Loading...</p>;
  if (!course) return <p>Course not found.</p>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Manage Course: {course.name}</h1>
        <Button variant="outline" onClick={() => router.back()}>Back</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Edit Course Form */}
        <Card>
          <CardHeader><CardTitle>Course Details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={e => { e.preventDefault(); updateMutation.mutate({ ...formData, fees: Number(formData.fees) }); }} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Duration</label>
                <Input placeholder="e.g. 3 months" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} />
              </div>
              <div>
                <label className="text-sm font-medium">Fees (৳)</label>
                <Input type="number" required min="0" value={formData.fees} onChange={e => setFormData({...formData, fees: Number(e.target.value)})} />
              </div>
              <div>
                <label className="text-sm font-medium">Category</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                  value={formData.categoryId} 
                  onChange={e => setFormData({...formData, categoryId: e.target.value})}
                >
                  <option value="">Select a category...</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <Button type="submit" disabled={updateMutation.isPending}>Save Changes</Button>
            </form>
          </CardContent>
        </Card>

        {/* Batches Management nested in Course */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Add New Batch</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={e => {
                e.preventDefault();
                createBatchMutation.mutate({ 
                  name: batchData.name, 
                  startDate: batchData.startDate ? new Date(batchData.startDate).toISOString() : undefined,
                  capacity: Number(batchData.capacity) || undefined,
                  courseId 
                });
              }} className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Batch Name</label>
                  <Input required placeholder="e.g. Batch 01" value={batchData.name} onChange={e => setBatchData({...batchData, name: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium">Start Date</label>
                  <Input type="date" value={batchData.startDate} onChange={e => setBatchData({...batchData, startDate: e.target.value})} />
                </div>
                <div>
                  <label className="text-sm font-medium">Capacity</label>
                  <Input type="number" min="1" value={batchData.capacity} onChange={e => setBatchData({...batchData, capacity: Number(e.target.value)})} />
                </div>
                <Button type="submit" disabled={createBatchMutation.isPending}>Create Batch</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Existing Batches</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {course.batches?.map((batch: any) => (
                  <div key={batch.id} className="flex justify-between items-center p-3 border rounded-md">
                    <div>
                      <p className="font-semibold">{batch.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {batch.startDate ? new Date(batch.startDate).toLocaleDateString() : 'No date'} 
                        {batch.capacity ? ` | Cap: ` + batch.capacity : ''}
                      </p>
                    </div>
                    <Button variant="destructive" size="icon" onClick={() => deleteBatchMutation.mutate(batch.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {(!course.batches || course.batches.length === 0) && <p className="text-sm text-muted-foreground">No batches created yet.</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
