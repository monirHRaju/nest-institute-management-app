'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, FolderPlus, Tags } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => get<any[]>('/categories'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      post('/categories', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setName('');
      setDescription('');
      toast.success('Category created successfully');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to create category';
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del('/categories/' + id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Category deleted');
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to delete category';
      toast.error(msg);
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Category name is required');
      return;
    }

    createMutation.mutate({
      name: trimmedName,
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Course Categories</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Organize academic programs and courses into departments or subject areas.
          </p>
        </div>
      </div>

      {/* Create Category Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Add New Category
          </CardTitle>
          <CardDescription>
            Enter the category title and optional description.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  placeholder="e.g. Computer Science, Graphic Design"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
              <div>
                <Input
                  placeholder="Description (Optional)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!name.trim() || createMutation.isPending}
                className="min-w-[100px]"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {createMutation.isPending ? 'Adding...' : 'Add Category'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Category List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tags className="h-5 w-5 text-muted-foreground" />
            Existing Categories ({categories.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-4 text-center">Loading categories...</p>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <Tags className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="font-medium text-foreground">No categories found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Use the form above to add your first course category.
              </p>
            </div>
          ) : (
            <div className="divide-y border rounded-lg overflow-hidden">
              {categories.map((cat: any) => (
                <div
                  key={cat.id}
                  className="flex justify-between items-center p-4 hover:bg-muted/20 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-foreground">{cat.name}</h3>
                    {cat.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:bg-destructive/10 h-8 w-8"
                    disabled={deleteMutation.isPending}
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete "${cat.name}"?`)) {
                        deleteMutation.mutate(cat.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
