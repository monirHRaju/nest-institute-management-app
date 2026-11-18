'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Bell, CheckCheck } from 'lucide-react';

export function NotificationBell() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const isTenantUser = Boolean(user && user.role !== 'SUPER_ADMIN');

  const { data } = useQuery<{ unreadCount: number; items: any[] }>({
    queryKey: ['my-notifications'],
    queryFn: () => get('/sms/notifications'),
    enabled: isTenantUser,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => patch(`/sms/notifications/${id}/read`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => post('/sms/notifications/read-all', {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-notifications'] });
    },
  });

  if (!isTenantUser) return null;

  const unread = data?.unreadCount || 0;
  const items = data?.items || [];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="relative"
        onClick={() => setOpen((v) => !v)}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border bg-background shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/40">
            <span className="text-xs font-semibold">
              Notifications ({unread} unread)
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <CheckCheck className="h-3.5 w-3.5" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto divide-y">
            {items.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              items.map((n: any) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.isRead) markReadMutation.mutate(n.id);
                  }}
                  className={`p-3 text-xs cursor-pointer hover:bg-muted/50 ${
                    !n.isRead ? 'bg-primary/5 font-medium' : 'text-muted-foreground'
                  }`}
                >
                  <div className="font-semibold text-foreground">{n.title}</div>
                  <div className="mt-0.5">{n.body}</div>
                  <div className="text-[10px] text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
