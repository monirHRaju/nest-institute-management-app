'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  FileText,
  History,
  RotateCcw,
  Save,
  Send,
  Settings,
} from 'lucide-react';

function estimateSegments(msg: string) {
  const len = msg.length;
  if (!len) return { len: 0, isUnicode: false, segments: 0 };
  // eslint-disable-next-line no-control-regex
  const isUnicode = /[^\x00-\x7F]/.test(msg);
  const segments = isUnicode
    ? len <= 70
      ? 1
      : Math.ceil(len / 67)
    : len <= 160
      ? 1
      : Math.ceil(len / 153);
  return { len, isUnicode, segments };
}

export default function SmsHubPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'send' | 'templates' | 'logs'>('send');

  // Bulk send state
  const [targetType, setTargetType] = useState<
    'BATCH' | 'COURSE' | 'ALL_STUDENTS' | 'ALL_STAFF' | 'CUSTOM'
  >('BATCH');
  const [batchId, setBatchId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [customPhones, setCustomPhones] = useState('');
  const [message, setMessage] = useState('');

  // Logs filter state
  const [logStatus, setLogStatus] = useState('');
  const [logSearch, setLogSearch] = useState('');

  // Templates state
  const [templatesDraft, setTemplatesDraft] = useState<any[]>([]);

  const { data: batches = [] } = useQuery<any[]>({
    queryKey: ['batches'],
    queryFn: () => get('/batches'),
  });

  const { data: courses = [] } = useQuery<any[]>({
    queryKey: ['courses'],
    queryFn: () => get('/courses'),
  });

  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ['sms-templates'],
    queryFn: () => get('/sms/templates'),
    enabled: tab === 'templates',
  });

  useEffect(() => {
    if (templates.length > 0) {
      setTemplatesDraft(
        templates.map((t: any) => ({
          eventType: t.eventType,
          body: t.body,
          isActive: Boolean(t.isActive),
        })),
      );
    }
  }, [templates]);

  const { data: logs = [], isLoading: loadingLogs } = useQuery<any[]>({
    queryKey: ['sms-logs', logStatus, logSearch],
    queryFn: () => {
      const params = new URLSearchParams();
      if (logStatus) params.set('status', logStatus);
      if (logSearch.trim()) params.set('search', logSearch.trim());
      const qs = params.toString();
      return get(`/sms/logs${qs ? `?${qs}` : ''}`);
    },
    enabled: tab === 'logs',
  });

  const sendMutation = useMutation({
    mutationFn: (payload: any) => post<any>('/sms/send', payload),
    onSuccess: (res) => {
      if (res.sent) {
        toast.success(
          `SMS sent to ${res.recipientCount} recipient(s) (${res.providerCode})`,
        );
        setMessage('');
      } else {
        toast.error(
          `SMS not sent (${res.status}): ${res.providerResponse || res.reason}`,
        );
      }
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to send SMS');
    },
  });

  const saveTemplatesMutation = useMutation({
    mutationFn: () => put('/sms/templates', { templates: templatesDraft }),
    onSuccess: () => {
      toast.success('SMS templates updated');
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to save templates');
    },
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => post<any>(`/sms/logs/${id}/retry`, {}),
    onSuccess: (res) => {
      if (res.sent) {
        toast.success('Retry succeeded');
      } else {
        toast.error(`Retry failed: ${res.providerResponse || res.reason}`);
      }
      queryClient.invalidateQueries({ queryKey: ['sms-logs'] });
    },
  });

  const segInfo = estimateSegments(message);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SMS &amp; Notifications Hub</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Broadcast SMS via BulkSMSBD, customize automated templates, and inspect delivery logs.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/settings">
            <Settings className="h-4 w-4 mr-2" />
            Gateway API Key &amp; Settings
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={tab === 'send' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('send')}
        >
          <Send className="h-4 w-4 mr-1.5" /> Broadcast SMS
        </Button>
        <Button
          variant={tab === 'templates' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('templates')}
        >
          <FileText className="h-4 w-4 mr-1.5" /> Message Templates
        </Button>
        <Button
          variant={tab === 'logs' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setTab('logs')}
        >
          <History className="h-4 w-4 mr-1.5" /> Delivery Logs
        </Button>
      </div>

      {/* Tab 1: Broadcast SMS */}
      {tab === 'send' && (
        <Card className="max-w-2xl">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Send Manual / Bulk SMS</CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMutation.mutate({
                  targetType,
                  batchId: targetType === 'BATCH' ? batchId : undefined,
                  courseId: targetType === 'COURSE' ? courseId : undefined,
                  customPhones:
                    targetType === 'CUSTOM'
                      ? customPhones
                          .split(/[,\n]/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                      : undefined,
                  message,
                });
              }}
              className="space-y-4"
            >
              <div>
                <Label>Recipient Group</Label>
                <select
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                >
                  <option value="BATCH">Students in a Batch</option>
                  <option value="COURSE">Students in a Course</option>
                  <option value="ALL_STUDENTS">All Active Students</option>
                  <option value="ALL_STAFF">All Active Staff &amp; Instructors</option>
                  <option value="CUSTOM">Custom Phone Numbers</option>
                </select>
              </div>

              {targetType === 'BATCH' && (
                <div>
                  <Label>Select Batch *</Label>
                  <select
                    required
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                  >
                    <option value="">Choose batch...</option>
                    {batches.map((b: any) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.course?.name})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'COURSE' && (
                <div>
                  <Label>Select Course *</Label>
                  <select
                    required
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm mt-1"
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                  >
                    <option value="">Choose course...</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {targetType === 'CUSTOM' && (
                <div>
                  <Label>Phone Numbers (comma-separated) *</Label>
                  <Input
                    required
                    placeholder="017XXXXXXXX, 018XXXXXXXX"
                    value={customPhones}
                    onChange={(e) => setCustomPhones(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}

              <div>
                <div className="flex items-center justify-between">
                  <Label>SMS Message *</Label>
                  <span className="text-xs text-muted-foreground">
                    {segInfo.len} chars · {segInfo.isUnicode ? 'Unicode/Bangla' : 'GSM-7'} ·{' '}
                    <strong>{segInfo.segments}</strong> segment(s)
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  className="w-full rounded-md border border-input bg-background p-3 text-sm mt-1"
                  placeholder="Write your notice or announcement..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={sendMutation.isPending}>
                  <Send className="h-4 w-4 mr-1.5" />
                  {sendMutation.isPending ? 'Dispatching...' : 'Send via BulkSMSBD'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tab 2: Templates */}
      {tab === 'templates' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between border-b">
            <div>
              <CardTitle className="text-lg">Automated SMS Templates</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Supported placeholders: <code>{'{{studentName}}'}</code>,{' '}
                <code>{'{{instituteName}}'}</code>, <code>{'{{courseName}}'}</code>,{' '}
                <code>{'{{batchName}}'}</code>, <code>{'{{amount}}'}</code>,{' '}
                <code>{'{{invoiceNo}}'}</code>, <code>{'{{dueDate}}'}</code>,{' '}
                <code>{'{{examName}}'}</code>, <code>{'{{marks}}'}</code>,{' '}
                <code>{'{{grade}}'}</code>
              </p>
            </div>
            <Button
              onClick={() => saveTemplatesMutation.mutate()}
              disabled={saveTemplatesMutation.isPending}
            >
              <Save className="h-4 w-4 mr-1.5" />
              {saveTemplatesMutation.isPending ? 'Saving...' : 'Save Templates'}
            </Button>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {templatesDraft.map((t, idx) => (
              <div key={t.eventType} className="border rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline">{t.eventType}</Badge>
                  <label className="text-xs flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={t.isActive}
                      onChange={(e) => {
                        const next = [...templatesDraft];
                        next[idx].isActive = e.target.checked;
                        setTemplatesDraft(next);
                      }}
                    />
                    Active
                  </label>
                </div>
                <Input
                  value={t.body}
                  onChange={(e) => {
                    const next = [...templatesDraft];
                    next[idx].body = e.target.value;
                    setTemplatesDraft(next);
                  }}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Delivery Logs */}
      {tab === 'logs' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b">
            <CardTitle className="text-lg">SMS Delivery Logs ({logs.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search phone or text..."
                value={logSearch}
                onChange={(e) => setLogSearch(e.target.value)}
                className="w-52 h-9"
              />
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={logStatus}
                onChange={(e) => setLogStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="SENT">SENT</option>
                <option value="FAILED">FAILED</option>
                <option value="SKIPPED">SKIPPED</option>
              </select>
            </div>
          </CardHeader>
          <CardContent>
            {loadingLogs ? (
              <div className="py-8 text-center text-muted-foreground">Loading logs...</div>
            ) : logs.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No SMS logs recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2.5 px-2 font-medium">Time</th>
                      <th className="py-2.5 px-2 font-medium">Phone</th>
                      <th className="py-2.5 px-2 font-medium">Event</th>
                      <th className="py-2.5 px-2 font-medium">Message</th>
                      <th className="py-2.5 px-2 font-medium">Status</th>
                      <th className="py-2.5 px-2 font-medium">Gateway Response</th>
                      <th className="py-2.5 px-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {logs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-muted/40">
                        <td className="py-2.5 px-2 text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.sentAt).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-2 font-mono text-xs">{log.phone}</td>
                        <td className="py-2.5 px-2 text-xs">
                          <Badge variant="outline">{log.eventType}</Badge>
                        </td>
                        <td className="py-2.5 px-2 max-w-xs truncate" title={log.message}>
                          {log.message}
                        </td>
                        <td className="py-2.5 px-2">
                          <Badge
                            variant={
                              log.status === 'SENT'
                                ? 'default'
                                : log.status === 'FAILED'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {log.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-2 text-xs text-muted-foreground">
                          {log.providerCode ? `[${log.providerCode}] ` : ''}
                          {log.providerResponse}
                        </td>
                        <td className="py-2.5 px-2 text-right">
                          {log.status !== 'SENT' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => retryMutation.mutate(log.id)}
                              disabled={retryMutation.isPending}
                              title="Retry SMS"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
