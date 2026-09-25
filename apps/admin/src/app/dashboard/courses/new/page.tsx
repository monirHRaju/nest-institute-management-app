'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { post, get } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function NewCoursePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: '', duration: '', fees: 0, categoryId: '' });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: () => get<any[]>('/categories'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => post('/courses', data),
    onSuccess: () => {
      toast.success('Course created');
      router.push('/dashboard/courses');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({ ...formData, fees: Number(formData.fees) });
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold">New Course</h1>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
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
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>Create Course</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
