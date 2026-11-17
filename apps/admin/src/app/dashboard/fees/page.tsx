'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { del, get, post } from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { InvoicePrintModal } from '@/components/invoice-print-modal';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CreditCard,
  DollarSign,
  ExternalLink,
  FileText,
  Layers,
  Percent,
  Plus,
  Printer,
  Receipt,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

type ActiveTab =
  | 'invoices'
  | 'structures'
  | 'discounts'
  | 'dues'
  | 'expenses';

export default function FeesPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isStudent = user?.role === 'STUDENT';
  const isAdmin = user?.role === 'TENANT_ADMIN';
  const canWrite = isAdmin || user?.role === 'STAFF';

  const [activeTab, setActiveTab] = useState<ActiveTab>('invoices');

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [courseFilter, setCourseFilter] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');
  const [expenseMonthFilter, setExpenseMonthFilter] = useState('');

  // Modals
  const [printingInvoice, setPrintingInvoice] = useState<any | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<any | null>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'CASH',
    reference: '',
    note: '',
  });

  // SSLCommerz Simulator Modal
  const [sslSimulator, setSslSimulator] = useState<{
    invoiceId: string;
    invoiceNo: string;
    tranId: string;
    amount: number;
  } | null>(null);

  // Create Fee Structure Modal
  const [showStructureModal, setShowStructureModal] = useState(false);
  const [structureForm, setStructureForm] = useState({
    courseId: '',
    name: 'Standard Fee Plan',
    totalAmount: '',
    installmentCount: 1,
  });

  // Create Discount Modal
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountForm, setDiscountForm] = useState({
    title: '',
    type: 'PERCENTAGE',
    value: '',
    reason: '',
  });

  // Assign Fee to Student Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignForm, setAssignForm] = useState({
    studentId: '',
    structureId: '',
    overrideTotal: '',
    discountId: '',
    note: '',
  });

  // Create Expense Modal
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    category: 'SALARY',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });

  // Check URL query for SSLCommerz simulator redirect
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const simInvoiceId = params.get('simulateSslCommerz');
    const tranId = params.get('tranId');
    const amount = Number(params.get('amount') || 0);
    if (simInvoiceId && tranId && amount > 0) {
      setSslSimulator({
        invoiceId: simInvoiceId,
        invoiceNo: simInvoiceId.slice(0, 8),
        tranId,
        amount,
      });
    }
  }, []);

  // Queries
  const { data: revenueData } = useQuery({
    queryKey: ['fees-revenue'],
    queryFn: () => get<any>('/fees/revenue'),
    enabled: canWrite,
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses'],
    queryFn: () => get<any[]>('/courses'),
    enabled: canWrite,
  });

  const { data: students = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => get<any[]>('/students'),
    enabled: canWrite,
  });

  const { data: invoices = [], isLoading: loadingInvoices } = useQuery({
    queryKey: ['fees-invoices', statusFilter, courseFilter, activeTab],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (activeTab === 'dues') {
        qs.set('overdueOnly', 'true');
      } else if (statusFilter !== 'ALL') {
        qs.set('status', statusFilter);
      }
      if (courseFilter) qs.set('courseId', courseFilter);
      const q = qs.toString();
      return get<any[]>(`/fees/invoices${q ? `?${q}` : ''}`);
    },
  });

  const { data: structures = [] } = useQuery({
    queryKey: ['fees-structures'],
    queryFn: () => get<any[]>('/fees/structures'),
    enabled: canWrite,
  });

  const { data: discounts = [] } = useQuery({
    queryKey: ['fees-discounts'],
    queryFn: () => get<any[]>('/fees/discounts'),
    enabled: canWrite,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['fees-expenses', expenseCategoryFilter, expenseMonthFilter],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (expenseCategoryFilter !== 'ALL')
        qs.set('category', expenseCategoryFilter);
      if (expenseMonthFilter) qs.set('month', expenseMonthFilter);
      const q = qs.toString();
      return get<any[]>(`/fees/expenses${q ? `?${q}` : ''}`);
    },
    enabled: canWrite,
  });

  // Mutations
  const recordPaymentMutation = useMutation({
    mutationFn: (payload: any) => post('/fees/payments', payload),
    onSuccess: () => {
      toast.success('Payment recorded & invoice updated!');
      setPayingInvoice(null);
      queryClient.invalidateQueries({ queryKey: ['fees-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fees-revenue'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to record payment');
    },
  });

  const createPayLinkMutation = useMutation({
    mutationFn: (invoiceId: string) =>
      post<any>(`/fees/invoices/${invoiceId}/pay-link`),
    onSuccess: (data) => {
      if (data.mode === 'SANDBOX_SIMULATOR') {
        setSslSimulator({
          invoiceId: data.invoiceId,
          invoiceNo: data.invoiceNo,
          tranId: data.tranId,
          amount: data.amount,
        });
      } else if (data.gatewayUrl) {
        window.open(data.gatewayUrl, '_blank');
      }
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || 'Failed to initiate SSLCommerz session',
      );
    },
  });

  const confirmSslIpnMutation = useMutation({
    mutationFn: (payload: any) => post('/fees/sslcommerz/ipn', payload),
    onSuccess: () => {
      toast.success('SSLCommerz payment verified & invoice marked PAID!');
      setSslSimulator(null);
      queryClient.invalidateQueries({ queryKey: ['fees-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fees-revenue'] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || 'SSLCommerz IPN verification failed',
      );
    },
  });

  const createStructureMutation = useMutation({
    mutationFn: (payload: any) => post('/fees/structures', payload),
    onSuccess: () => {
      toast.success('Fee structure created');
      setShowStructureModal(false);
      queryClient.invalidateQueries({ queryKey: ['fees-structures'] });
    },
    onError: (err: any) => {
      toast.error(
        err?.response?.data?.message || 'Failed to create fee structure',
      );
    },
  });

  const deleteStructureMutation = useMutation({
    mutationFn: (id: string) => del(`/fees/structures/${id}`),
    onSuccess: () => {
      toast.success('Fee structure deleted');
      queryClient.invalidateQueries({ queryKey: ['fees-structures'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Cannot delete structure');
    },
  });

  const createDiscountMutation = useMutation({
    mutationFn: (payload: any) => post('/fees/discounts', payload),
    onSuccess: () => {
      toast.success('Discount / Scholarship saved');
      setShowDiscountModal(false);
      setDiscountForm({ title: '', type: 'PERCENTAGE', value: '', reason: '' });
      queryClient.invalidateQueries({ queryKey: ['fees-discounts'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create discount');
    },
  });

  const assignFeeMutation = useMutation({
    mutationFn: (payload: { studentId: string; data: any }) =>
      post(`/fees/students/${payload.studentId}/assign`, payload.data),
    onSuccess: () => {
      toast.success('Fee structure assigned & installment invoices generated!');
      setShowAssignModal(false);
      queryClient.invalidateQueries({ queryKey: ['fees-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fees-structures'] });
      queryClient.invalidateQueries({ queryKey: ['fees-revenue'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to assign fee');
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: (invoiceId: string) =>
      post(`/fees/invoices/${invoiceId}/remind`),
    onSuccess: () => {
      toast.success('SMS payment reminder dispatched via Green Web BD!');
      queryClient.invalidateQueries({ queryKey: ['fees-invoices'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to send SMS reminder');
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: (payload: any) => post('/fees/expenses', payload),
    onSuccess: () => {
      toast.success('Expense recorded');
      setShowExpenseModal(false);
      setExpenseForm({
        title: '',
        category: 'SALARY',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        note: '',
      });
      queryClient.invalidateQueries({ queryKey: ['fees-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['fees-revenue'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to record expense');
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: (id: string) => del(`/fees/expenses/${id}`),
    onSuccess: () => {
      toast.success('Expense deleted');
      queryClient.invalidateQueries({ queryKey: ['fees-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['fees-revenue'] });
    },
  });

  const openRecordPayment = (inv: any) => {
    const due = Math.max(
      0,
      Number((Number(inv.amount) - Number(inv.paidAmount)).toFixed(2)),
    );
    setPayingInvoice(inv);
    setPaymentForm({
      amount: String(due),
      method: 'CASH',
      reference: '',
      note: '',
    });
  };

  const openPrintInvoice = async (inv: any) => {
    try {
      const full = await get<any>(`/fees/invoices/${inv.id}`);
      setPrintingInvoice(full);
    } catch {
      setPrintingInvoice(inv);
    }
  };

  const kpis = revenueData?.kpis;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            {isStudent ? 'My Fees & Invoices' : 'Fees & Accounting'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isStudent
              ? 'View your course fee installments, pay online via SSLCommerz, and download receipts.'
              : 'Manage course fee structures, scholarships, installment invoices, payments, overdue alerts, and expenses.'}
          </p>
        </div>

        {canWrite && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAssignModal(true)}
            >
              <Receipt className="h-4 w-4 mr-1.5" /> Assign Student Fee
            </Button>
            {isAdmin && (
              <Button onClick={() => setShowStructureModal(true)}>
                <Plus className="h-4 w-4 mr-1.5" /> New Fee Structure
              </Button>
            )}
          </div>
        )}
      </div>

      {/* KPI Strip for Admin/Staff */}
      {canWrite && kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                Total Collected
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                ৳{Number(kpis.totalCollected).toLocaleString('en-BD')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This month: ৳
                {Number(kpis.monthlyCollected).toLocaleString('en-BD')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                Pending Dues
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">
                ৳{Number(kpis.pendingDues).toLocaleString('en-BD')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Overdue ({kpis.overdueCount}): ৳
                {Number(kpis.overdueDues).toLocaleString('en-BD')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                Total Expenses
              </CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                ৳{Number(kpis.totalExpenses).toLocaleString('en-BD')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                This month: ৳
                {Number(kpis.monthlyExpenses).toLocaleString('en-BD')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                Net Profit / Loss
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  kpis.netProfit >= 0 ? 'text-emerald-600' : 'text-destructive'
                }`}
              >
                {kpis.netProfit >= 0 ? '+' : ''}৳
                {Number(kpis.netProfit).toLocaleString('en-BD')}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Collected income minus expenses
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation Tabs (Admin/Staff) */}
      {canWrite && (
        <div className="flex flex-wrap gap-2 border-b pb-3">
          <Button
            size="sm"
            variant={activeTab === 'invoices' ? 'default' : 'outline'}
            onClick={() => setActiveTab('invoices')}
          >
            <FileText className="h-4 w-4 mr-1.5" /> Invoices &amp; Payments
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'structures' ? 'default' : 'outline'}
            onClick={() => setActiveTab('structures')}
          >
            <Layers className="h-4 w-4 mr-1.5" /> Fee Structures (
            {structures.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'discounts' ? 'default' : 'outline'}
            onClick={() => setActiveTab('discounts')}
          >
            <Percent className="h-4 w-4 mr-1.5" /> Discounts &amp; Scholarships (
            {discounts.length})
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'dues' ? 'default' : 'outline'}
            onClick={() => setActiveTab('dues')}
          >
            <AlertTriangle className="h-4 w-4 mr-1.5" /> Overdue Dues Alerts
            {kpis?.overdueCount ? ` (${kpis.overdueCount})` : ''}
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'expenses' ? 'default' : 'outline'}
            onClick={() => setActiveTab('expenses')}
          >
            <TrendingDown className="h-4 w-4 mr-1.5" /> Expense Ledger
          </Button>
        </div>
      )}

      {/* TAB 1 & 4: INVOICES / OVERDUE DUES */}
      {(activeTab === 'invoices' || activeTab === 'dues' || isStudent) && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">
              {activeTab === 'dues'
                ? 'Overdue Invoices Requiring Follow-up'
                : 'Fee Invoices'}
            </CardTitle>

            {activeTab === 'invoices' && (
              <div className="flex flex-wrap gap-2">
                {canWrite && (
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                    value={courseFilter}
                    onChange={(e) => setCourseFilter(e.target.value)}
                  >
                    <option value="">All Courses</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
                {(
                  [
                    'ALL',
                    'UNPAID',
                    'PARTIALLY_PAID',
                    'PAID',
                    'OVERDUE',
                  ] as const
                ).map((st) => (
                  <Button
                    key={st}
                    size="sm"
                    variant={statusFilter === st ? 'default' : 'outline'}
                    onClick={() => setStatusFilter(st)}
                  >
                    {st.replace('_', ' ')}
                  </Button>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {loadingInvoices ? (
              <p className="text-sm text-muted-foreground py-6">
                Loading invoices...
              </p>
            ) : invoices.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No invoices match the current view.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-3 px-3 font-medium">Invoice #</th>
                      {!isStudent && (
                        <th className="py-3 px-3 font-medium">Student</th>
                      )}
                      <th className="py-3 px-3 font-medium">Description</th>
                      <th className="py-3 px-3 font-medium">Amount</th>
                      <th className="py-3 px-3 font-medium">Paid / Due</th>
                      <th className="py-3 px-3 font-medium">Due Date</th>
                      <th className="py-3 px-3 font-medium">Status</th>
                      <th className="py-3 px-3 font-medium text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoices.map((inv: any) => {
                      const amt = Number(inv.amount);
                      const paid = Number(inv.paidAmount);
                      const due = Math.max(
                        0,
                        Number((amt - paid).toFixed(2)),
                      );
                      return (
                        <tr key={inv.id} className="hover:bg-muted/30">
                          <td className="py-3 px-3 font-mono font-semibold text-xs">
                            {inv.invoiceNo}
                          </td>
                          {!isStudent && (
                            <td className="py-3 px-3">
                              <div className="font-medium">
                                {inv.student?.user?.firstName}{' '}
                                {inv.student?.user?.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {inv.student?.user?.phone || '—'}
                              </div>
                            </td>
                          )}
                          <td className="py-3 px-3">
                            <div className="font-medium">
                              {inv.title || 'Course Fee'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Installment #{inv.installmentNo}
                              {Number(inv.discount) > 0
                                ? ` • Discount: ৳${Number(inv.discount).toLocaleString('en-BD')}`
                                : ''}
                            </div>
                          </td>
                          <td className="py-3 px-3 font-semibold">
                            ৳{amt.toLocaleString('en-BD')}
                          </td>
                          <td className="py-3 px-3">
                            <div className="text-emerald-600 text-xs font-medium">
                              Paid: ৳{paid.toLocaleString('en-BD')}
                            </div>
                            <div className="text-xs font-semibold">
                              Due: ৳{due.toLocaleString('en-BD')}
                            </div>
                          </td>
                          <td className="py-3 px-3 whitespace-nowrap text-xs">
                            {new Date(inv.dueDate).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-3 px-3">
                            <Badge
                              variant={
                                inv.status === 'PAID'
                                  ? 'default'
                                  : inv.status === 'OVERDUE'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-right whitespace-nowrap">
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openPrintInvoice(inv)}
                              >
                                <Printer className="h-3.5 w-3.5 mr-1" /> PDF
                              </Button>

                              {due > 0 && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    createPayLinkMutation.mutate(inv.id)
                                  }
                                  disabled={createPayLinkMutation.isPending}
                                >
                                  <ExternalLink className="h-3.5 w-3.5 mr-1" />{' '}
                                  SSLCommerz
                                </Button>
                              )}

                              {canWrite && due > 0 && (
                                <Button
                                  size="sm"
                                  onClick={() => openRecordPayment(inv)}
                                >
                                  <CreditCard className="h-3.5 w-3.5 mr-1" />{' '}
                                  Pay
                                </Button>
                              )}

                              {canWrite && due > 0 && (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() =>
                                    sendReminderMutation.mutate(inv.id)
                                  }
                                  disabled={sendReminderMutation.isPending}
                                  title="Send SMS Due Reminder"
                                >
                                  <Bell className="h-3.5 w-3.5 mr-1" /> SMS
                                </Button>
                              )}
                            </div>
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
      )}

      {/* TAB 2: FEE STRUCTURES */}
      {canWrite && activeTab === 'structures' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Course Fee Structures &amp; Installment Plans
            </CardTitle>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowStructureModal(true)}>
                <Plus className="h-4 w-4 mr-1" /> Add Structure
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {structures.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No fee structures created yet. Create a course or click &ldquo;Add
                Structure&rdquo;.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-3 px-4">Structure Name</th>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Total Amount</th>
                      <th className="py-3 px-4">Installments</th>
                      <th className="py-3 px-4">Assigned Students</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {structures.map((st: any) => (
                      <tr key={st.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-semibold">{st.name}</td>
                        <td className="py-3 px-4">{st.course?.name || '—'}</td>
                        <td className="py-3 px-4 font-bold">
                          ৳{Number(st.totalAmount).toLocaleString('en-BD')}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary">
                            {st.installmentCount}{' '}
                            {st.installmentCount === 1
                              ? 'Installment'
                              : 'Installments'}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {st._count?.assignments ?? 0}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isAdmin && (st._count?.assignments ?? 0) === 0 && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                deleteStructureMutation.mutate(st.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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

      {/* TAB 3: DISCOUNTS & SCHOLARSHIPS */}
      {canWrite && activeTab === 'discounts' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">
              Discounts &amp; Scholarships Catalog
            </CardTitle>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowDiscountModal(true)}>
                <Plus className="h-4 w-4 mr-1" /> New Discount / Scholarship
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {discounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No discounts or scholarships defined yet.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Value</th>
                      <th className="py-3 px-4">Reason / Notes</th>
                      <th className="py-3 px-4">Approved By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {discounts.map((d: any) => (
                      <tr key={d.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 font-semibold">{d.title}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{d.type}</Badge>
                        </td>
                        <td className="py-3 px-4 font-bold text-emerald-600">
                          {d.type === 'PERCENTAGE'
                            ? `${Number(d.value)}%`
                            : `৳${Number(d.value).toLocaleString('en-BD')}`}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">
                          {d.reason || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {d.approvedBy
                            ? `${d.approvedBy.firstName} ${d.approvedBy.lastName}`
                            : 'Admin'}
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

      {/* TAB 5: EXPENSE LEDGER */}
      {canWrite && activeTab === 'expenses' && (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-lg">Institute Expense Ledger</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-xs"
                value={expenseCategoryFilter}
                onChange={(e) => setExpenseCategoryFilter(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                <option value="SALARY">SALARY</option>
                <option value="RENT">RENT</option>
                <option value="UTILITIES">UTILITIES</option>
                <option value="MARKETING">MARKETING</option>
                <option value="EQUIPMENT">EQUIPMENT</option>
                <option value="OTHER">OTHER</option>
              </select>
              <Input
                type="month"
                className="h-9 w-40 text-xs"
                value={expenseMonthFilter}
                onChange={(e) => setExpenseMonthFilter(e.target.value)}
              />
              <Button size="sm" onClick={() => setShowExpenseModal(true)}>
                <Plus className="h-4 w-4 mr-1" /> Record Expense
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No expenses recorded for the selected filters.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Title</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Note</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      {isAdmin && (
                        <th className="py-3 px-4 text-right">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {expenses.map((ex: any) => (
                      <tr key={ex.id} className="hover:bg-muted/30">
                        <td className="py-3 px-4 whitespace-nowrap text-xs">
                          {new Date(ex.date).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-3 px-4 font-medium">{ex.title}</td>
                        <td className="py-3 px-4">
                          <Badge variant="secondary">{ex.category}</Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {ex.note || '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-destructive">
                          ৳{Number(ex.amount).toLocaleString('en-BD')}
                        </td>
                        {isAdmin && (
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                deleteExpenseMutation.mutate(ex.id)
                              }
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL: Print / PDF Invoice */}
      <InvoicePrintModal
        invoice={printingInvoice}
        onClose={() => setPrintingInvoice(null)}
      />

      {/* MODAL: Record Manual Payment */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle>
                Record Payment — {payingInvoice.invoiceNo}
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Student: {payingInvoice.student?.user?.firstName}{' '}
                {payingInvoice.student?.user?.lastName}
              </p>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  recordPaymentMutation.mutate({
                    invoiceId: payingInvoice.id,
                    amount: Number(paymentForm.amount),
                    method: paymentForm.method,
                    reference: paymentForm.reference || undefined,
                    note: paymentForm.note || undefined,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Amount (BDT ৳) *
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    value={paymentForm.amount}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, amount: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Payment Method
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={paymentForm.method}
                    onChange={(e) =>
                      setPaymentForm({ ...paymentForm, method: e.target.value })
                    }
                  >
                    <option value="CASH">CASH</option>
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="CARD">Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Transaction / Reference ID
                  </label>
                  <Input
                    placeholder="e.g. TrxID or Bank Slip #"
                    value={paymentForm.reference}
                    onChange={(e) =>
                      setPaymentForm({
                        ...paymentForm,
                        reference: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPayingInvoice(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={recordPaymentMutation.isPending}
                  >
                    {recordPaymentMutation.isPending
                      ? 'Saving...'
                      : 'Confirm Payment'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: SSLCommerz Sandbox Gateway Simulator */}
      {sslSimulator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md shadow-xl border-primary">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge className="bg-blue-600 text-white">
                  SSLCommerz Sandbox Gateway
                </Badge>
                <span className="text-xs font-mono text-muted-foreground">
                  {sslSimulator.tranId}
                </span>
              </div>
              <CardTitle className="mt-2">
                Online Payment Checkout (BDT ৳
                {sslSimulator.amount.toLocaleString('en-BD')})
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Invoice: <strong>{sslSimulator.invoiceNo}</strong>. Click below
                to simulate a verified SSLCommerz IPN webhook callback.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-xs space-y-1">
                <div>
                  <strong>Channel:</strong> bKash / Nagad / Visa / Mastercard
                </div>
                <div>
                  <strong>Amount:</strong> ৳
                  {sslSimulator.amount.toLocaleString('en-BD')} BDT
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSslSimulator(null)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={confirmSslIpnMutation.isPending}
                  onClick={() =>
                    confirmSslIpnMutation.mutate({
                      tran_id: sslSimulator.tranId,
                      val_id: `VAL-${Date.now()}`,
                      amount: sslSimulator.amount,
                      currency: 'BDT',
                      status: 'VALID',
                      value_a: user?.tenantId,
                      value_b: sslSimulator.invoiceId,
                    })
                  }
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Authorize Sandbox
                  Payment
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: Create Fee Structure */}
      {showStructureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle>Create Fee Structure</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createStructureMutation.mutate({
                    courseId: structureForm.courseId,
                    name: structureForm.name,
                    totalAmount: Number(structureForm.totalAmount),
                    installmentCount: Number(structureForm.installmentCount),
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Course *
                  </label>
                  <select
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={structureForm.courseId}
                    onChange={(e) => {
                      const c = courses.find(
                        (item: any) => item.id === e.target.value,
                      );
                      setStructureForm({
                        ...structureForm,
                        courseId: e.target.value,
                        totalAmount: c ? String(c.fees) : structureForm.totalAmount,
                      });
                    }}
                  >
                    <option value="">Select course...</option>
                    {courses.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (৳{c.fees})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Structure Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. 3-Installment Plan"
                    value={structureForm.name}
                    onChange={(e) =>
                      setStructureForm({
                        ...structureForm,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Total Fee (৳) *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      required
                      value={structureForm.totalAmount}
                      onChange={(e) =>
                        setStructureForm({
                          ...structureForm,
                          totalAmount: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Installments (1–12)
                    </label>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      required
                      value={structureForm.installmentCount}
                      onChange={(e) =>
                        setStructureForm({
                          ...structureForm,
                          installmentCount: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowStructureModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createStructureMutation.isPending}
                  >
                    Save Structure
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: Create Discount */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle>Create Discount / Scholarship</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createDiscountMutation.mutate({
                    title: discountForm.title,
                    type: discountForm.type,
                    value: Number(discountForm.value),
                    reason: discountForm.reason || undefined,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Title *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Merit Scholarship 25%"
                    value={discountForm.title}
                    onChange={(e) =>
                      setDiscountForm({
                        ...discountForm,
                        title: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Discount Type
                    </label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={discountForm.type}
                      onChange={(e) =>
                        setDiscountForm({
                          ...discountForm,
                          type: e.target.value,
                        })
                      }
                    >
                      <option value="PERCENTAGE">PERCENTAGE (%)</option>
                      <option value="FLAT">FLAT (৳)</option>
                      <option value="SCHOLARSHIP">SCHOLARSHIP (৳)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Value *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      required
                      value={discountForm.value}
                      onChange={(e) =>
                        setDiscountForm({
                          ...discountForm,
                          value: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Reason / Criteria
                  </label>
                  <Input
                    value={discountForm.reason}
                    onChange={(e) =>
                      setDiscountForm({
                        ...discountForm,
                        reason: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDiscountModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createDiscountMutation.isPending}
                  >
                    Create Discount
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: Assign Fee Structure to Student */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle>Assign Fee Structure to Student</CardTitle>
              <p className="text-xs text-muted-foreground">
                Automatically generates installment invoices based on the
                selected structure and discount.
              </p>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  assignFeeMutation.mutate({
                    studentId: assignForm.studentId,
                    data: {
                      structureId: assignForm.structureId,
                      overrideTotal: assignForm.overrideTotal
                        ? Number(assignForm.overrideTotal)
                        : undefined,
                      discountId: assignForm.discountId || undefined,
                      note: assignForm.note || undefined,
                      generateInvoices: true,
                    },
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Student *
                  </label>
                  <select
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={assignForm.studentId}
                    onChange={(e) =>
                      setAssignForm({
                        ...assignForm,
                        studentId: e.target.value,
                      })
                    }
                  >
                    <option value="">Select student...</option>
                    {students.map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.user.firstName} {s.user.lastName} (
                        {s.user.phone || s.user.email})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Fee Structure *
                  </label>
                  <select
                    required
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={assignForm.structureId}
                    onChange={(e) =>
                      setAssignForm({
                        ...assignForm,
                        structureId: e.target.value,
                      })
                    }
                  >
                    <option value="">Select fee structure...</option>
                    {structures.map((st: any) => (
                      <option key={st.id} value={st.id}>
                        {st.course?.name} — {st.name} (৳{st.totalAmount} /{' '}
                        {st.installmentCount} inst.)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Discount (Optional)
                    </label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={assignForm.discountId}
                      onChange={(e) =>
                        setAssignForm({
                          ...assignForm,
                          discountId: e.target.value,
                        })
                      }
                    >
                      <option value="">None</option>
                      {discounts.map((d: any) => (
                        <option key={d.id} value={d.id}>
                          {d.title} (
                          {d.type === 'PERCENTAGE'
                            ? `${d.value}%`
                            : `৳${d.value}`}
                          )
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Override Total (৳)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="Default structure fee"
                      value={assignForm.overrideTotal}
                      onChange={(e) =>
                        setAssignForm({
                          ...assignForm,
                          overrideTotal: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAssignModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={assignFeeMutation.isPending}
                  >
                    Assign &amp; Generate Invoices
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: Record Expense */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle>Record Institute Expense</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  createExpenseMutation.mutate({
                    title: expenseForm.title,
                    category: expenseForm.category,
                    amount: Number(expenseForm.amount),
                    date: expenseForm.date,
                    note: expenseForm.note || undefined,
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Expense Title *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Lab Instructor Salary - Nov"
                    value={expenseForm.title}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, title: e.target.value })
                    }
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Category
                    </label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={expenseForm.category}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          category: e.target.value,
                        })
                      }
                    >
                      <option value="SALARY">SALARY</option>
                      <option value="RENT">RENT</option>
                      <option value="UTILITIES">UTILITIES</option>
                      <option value="MARKETING">MARKETING</option>
                      <option value="EQUIPMENT">EQUIPMENT</option>
                      <option value="OTHER">OTHER</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Amount (৳) *
                    </label>
                    <Input
                      type="number"
                      min="1"
                      step="0.01"
                      required
                      value={expenseForm.amount}
                      onChange={(e) =>
                        setExpenseForm({
                          ...expenseForm,
                          amount: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Date
                  </label>
                  <Input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Note
                  </label>
                  <Input
                    value={expenseForm.note}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, note: e.target.value })
                    }
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowExpenseModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createExpenseMutation.isPending}
                  >
                    Save Expense
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
