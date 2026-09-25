'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => get<any[]>('/categories'),
  });

  const createMutation = useMutation({
    mutationFn: (newName: string) => post('/categories', { name: newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setName('');
      toast.success('Category created');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(/categories/ + id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Categories</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Category</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Input 
            placeholder="Category Name" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
          <Button onClick={() => createMutation.mutate(name)} disabled={!name || createMutation.isPending}>
            <Plus className="mr-2 h-4 w-4" /> Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <div className="space-y-2">
              {categories.map((cat: any) => (
                <div key={cat.id} className="flex justify-between items-center p-3 border rounded-md">
                  <span>{cat.name}</span>
                  <Button variant="destructive" size="icon" onClick={() => deleteMutation.mutate(cat.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-muted-foreground">No categories found.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
