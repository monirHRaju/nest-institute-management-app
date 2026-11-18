'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, patch, post } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { PayslipPrintModal } from '@/components/payslip-print-modal';
import { toast } from 'sonner';
import {
  CheckCircle2,
  CreditCard,
  FileText,
  Play,
  Save,
  Wallet,
} from 'lucide-react';

export default function PayrollPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.role === 'TENANT_ADMIN';

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState('');
  const [payMethod, setPayMethod] = useState('BANK_TRANSFER');

  // Local edits keyed by payroll id
  const [edits, setEdits] = useState<
    Record<string, { allowances: string; bonus: string; deductions: string }>
  >({});

  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);

  const { data: payrolls = [], isLoading } = useQuery<any[]>({
    queryKey: ['payroll', month, year, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('month', String(month));
      params.set('year', String(year));
      if (statusFilter) params.set('status', statusFilter);
      return get<any[]>(`/payroll?${params.toString()}`);
    },
  });

  const generateMutation = useMutation({
    mutationFn: () => post<any>('/payroll/generate', { month, year }),
    onSuccess: (res) => {
      toast.success(
        `Generated ${res.createdCount} payroll(s) (${res.skippedCount} already existed)`,
      );
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to generate payroll');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) =>
      patch(`/payroll/${id}`, payload),
    onSuccess: (_res, vars) => {
      toast.success('Payroll updated');
      setEdits((prev) => {
        const copy = { ...prev };
        delete copy[vars.id];
        return copy;
      });
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update payroll');
    },
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => post(`/payroll/${id}/approve`, {}),
    onSuccess: () => {
      toast.success('Payroll approved');
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to approve payroll');
    },
  });

  const payMutation = useMutation({
    mutationFn: (id: string) =>
      post(`/payroll/${id}/pay`, { method: payMethod }),
    onSuccess: () => {
      toast.success('Payroll marked as PAID & salary expense recorded');
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to pay payroll');
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: (ids: string[]) => post<any>('/payroll/bulk-approve', { ids }),
    onSuccess: (res) => {
      toast.success(`Approved ${res.approvedCount} payroll(s)`);
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Bulk approve failed');
    },
  });

  const bulkPayMutation = useMutation({
    mutationFn: (ids: string[]) =>
      post<any>('/payroll/bulk-pay', { ids, method: payMethod }),
    onSuccess: (res) => {
      toast.success(`Paid ${res.paidCount} payroll(s) & recorded salary expenses`);
      queryClient.invalidateQueries({ queryKey: ['payroll'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Bulk pay failed');
    },
  });

  const openPayslip = async (id: string) => {
    try {
      const data = await get(`/payroll/${id}/payslip`);
      setSelectedPayslip(data);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to load payslip');
    }
  };

  const draftIds = payrolls.filter((p) => p.status === 'DRAFT').map((p) => p.id);
  const approvedIds = payrolls.filter((p) => p.status === 'APPROVED').map((p) => p.id);

  const totalNet = payrolls.reduce((s, p) => s + Number(p.netAmount), 0);
  const totalPaid = payrolls
    .filter((p) => p.status === 'PAID')
    .reduce((s, p) => s + Number(p.netAmount), 0);
  const totalPending = totalNet - totalPaid;

  const getEditValues = (p: any) =>
    edits[p.id] ?? {
      allowances: String(p.allowances ?? 0),
      bonus: String(p.bonus ?? 0),
      deductions: String(p.deductions ?? 0),
    };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payroll</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Generate monthly salaries, approve payouts, and record salary expenses.
          </p>
        </div>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
            >
              <Play className="h-4 w-4 mr-1.5" />
              {generateMutation.isPending ? 'Generating...' : 'Generate Month'}
            </Button>
            {draftIds.length > 0 && (
              <Button
                variant="outline"
                onClick={() => bulkApproveMutation.mutate(draftIds)}
                disabled={bulkApproveMutation.isPending}
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Approve All ({draftIds.length})
              </Button>
            )}
            {approvedIds.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => bulkPayMutation.mutate(approvedIds)}
                disabled={bulkPayMutation.isPending}
              >
                <CreditCard className="h-4 w-4 mr-1.5" />
                Pay All ({approvedIds.length})
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Month:</span>
            <select
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1, 1).toLocaleString('en', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Year:</span>
            <Input
              type="number"
              className="w-24"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PAID">PAID</option>
          </select>
          {isAdmin && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">Pay Method:</span>
              <select
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
              >
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CASH">Cash</option>
                <option value="BKASH">bKash</option>
                <option value="NAGAD">Nagad</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">Total Net Payroll</div>
            <div className="text-2xl font-bold mt-1">৳{totalNet.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">Total Paid</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              ৳{totalPaid.toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground uppercase">Pending Payout</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">
              ৳{totalPending.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Payroll Sheet ({payrolls.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading payrolls...</div>
          ) : payrolls.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No payroll records for this period.
              {isAdmin && ' Click "Generate Month" to create DRAFT records for active staff.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-3 px-2 font-medium">Staff</th>
                    <th className="py-3 px-2 font-medium">Base</th>
                    <th className="py-3 px-2 font-medium">Allowances</th>
                    <th className="py-3 px-2 font-medium">Bonus</th>
                    <th className="py-3 px-2 font-medium">Deductions</th>
                    <th className="py-3 px-2 font-medium">Net</th>
                    <th className="py-3 px-2 font-medium">Status</th>
                    <th className="py-3 px-2 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {payrolls.map((p) => {
                    const ev = getEditValues(p);
                    const isDraft = p.status === 'DRAFT' && isAdmin;
                    const dirty = Boolean(edits[p.id]);

                    return (
                      <tr key={p.id} className="hover:bg-muted/40">
                        <td className="py-3 px-2">
                          <div className="font-medium">
                            {p.staff?.user?.firstName} {p.staff?.user?.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {p.staff?.designation}
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          ৳{Number(p.baseAmount).toLocaleString()}
                        </td>
                        <td className="py-3 px-2">
                          {isDraft ? (
                            <Input
                              type="number"
                              min={0}
                              className="w-24 h-8"
                              value={ev.allowances}
                              onChange={(e) =>
                                setEdits({
                                  ...edits,
                                  [p.id]: { ...ev, allowances: e.target.value },
                                })
                              }
                            />
                          ) : (
                            `৳${Number(p.allowances).toLocaleString()}`
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {isDraft ? (
                            <Input
                              type="number"
                              min={0}
                              className="w-24 h-8"
                              value={ev.bonus}
                              onChange={(e) =>
                                setEdits({
                                  ...edits,
                                  [p.id]: { ...ev, bonus: e.target.value },
                                })
                              }
                            />
                          ) : (
                            `৳${Number(p.bonus).toLocaleString()}`
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {isDraft ? (
                            <Input
                              type="number"
                              min={0}
                              className="w-24 h-8"
                              value={ev.deductions}
                              onChange={(e) =>
                                setEdits({
                                  ...edits,
                                  [p.id]: { ...ev, deductions: e.target.value },
                                })
                              }
                            />
                          ) : (
                            `৳${Number(p.deductions).toLocaleString()}`
                          )}
                        </td>
                        <td className="py-3 px-2 font-bold">
                          ৳{Number(p.netAmount).toLocaleString()}
                        </td>
                        <td className="py-3 px-2">
                          <Badge
                            variant={
                              p.status === 'PAID'
                                ? 'default'
                                : p.status === 'APPROVED'
                                  ? 'secondary'
                                  : 'outline'
                            }
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-right space-x-1">
                          {isDraft && dirty && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateMutation.mutate({
                                  id: p.id,
                                  payload: {
                                    allowances: Number(ev.allowances || 0),
                                    bonus: Number(ev.bonus || 0),
                                    deductions: Number(ev.deductions || 0),
                                  },
                                })
                              }
                            >
                              <Save className="h-3.5 w-3.5 mr-1" /> Save
                            </Button>
                          )}
                          {isDraft && !dirty && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveMutation.mutate(p.id)}
                            >
                              Approve
                            </Button>
                          )}
                          {isAdmin && p.status === 'APPROVED' && (
                            <Button
                              size="sm"
                              onClick={() => payMutation.mutate(p.id)}
                            >
                              Pay
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openPayslip(p.id)}
                            title="View Payslip"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <PayslipPrintModal
        payslip={selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
      />
    </div>
  );
}
