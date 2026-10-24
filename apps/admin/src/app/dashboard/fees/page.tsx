'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '@/lib/api';
import { toast } from 'sonner';
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Plus,
  Receipt,
  Search,
  CheckCircle2,
  Clock,
  Filter,
  Eye,
  Trash2,
  ArrowDownLeft,
  Smartphone,
  Wallet,
} from 'lucide-react';
import type {
  FeeInvoiceRecord,
  PaymentRecord,
  FinancialStatsSummary,
  PaginatedResponse,
} from '@repo/shared';
import { InvoiceStatus, PaymentMethod, FeeType } from '@repo/shared';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PaymentReceiptModal } from '@/components/payment-receipt-modal';

export default function FeesManagementPage() {
  const queryClient = useQueryClient();

  // Active Tab: 'invoices' | 'payments'
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments'>('invoices');

  // Query filters
  const [search, setSearch] = useState('');
  const [invoiceStatus, setInvoiceStatus] = useState<string>('ALL');
  const [invoiceType, setInvoiceType] = useState<string>('ALL');
  const [paymentMethod, setPaymentMethod] = useState<string>('ALL');

  // Modals state
  const [isCreateInvoiceOpen, setIsCreateInvoiceOpen] = useState(false);
  const [isCollectPaymentOpen, setIsCollectPaymentOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<FeeInvoiceRecord | null>(null);
  const [activeReceiptPayment, setActiveReceiptPayment] = useState<PaymentRecord | null>(null);

  // Form states
  const [invoiceForm, setInvoiceForm] = useState({
    studentId: '',
    courseId: '',
    title: '',
    feeType: 'TUITION',
    amount: '',
    discount: '0',
    dueDate: '',
    notes: '',
  });

  const [paymentForm, setPaymentForm] = useState({
    invoiceId: '',
    amount: '',
    method: 'CASH',
    transactionId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    notes: '',
  });

  // Fetch Financial Overview Stats
  const { data: stats } = useQuery<FinancialStatsSummary>({
    queryKey: ['fee-stats'],
    queryFn: () => get<FinancialStatsSummary>('/fees/stats'),
  });

  // Fetch Invoices
  const { data: invoicesData, isLoading: isLoadingInvoices } = useQuery<PaginatedResponse<FeeInvoiceRecord>>({
    queryKey: ['fee-invoices', search, invoiceStatus, invoiceType],
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (invoiceStatus !== 'ALL') params.append('status', invoiceStatus);
      if (invoiceType !== 'ALL') params.append('feeType', invoiceType);
      return get<PaginatedResponse<FeeInvoiceRecord>>(`/fees/invoices?${params.toString()}`);
    },
  });

  // Fetch Payments
  const { data: paymentsData, isLoading: isLoadingPayments } = useQuery<PaginatedResponse<PaymentRecord>>({
    queryKey: ['fee-payments', paymentMethod],
    queryFn: () => {
      const params = new URLSearchParams();
      if (paymentMethod !== 'ALL') params.append('method', paymentMethod);
      return get<PaginatedResponse<PaymentRecord>>(`/fees/payments?${params.toString()}`);
    },
  });

  // Fetch Students & Courses for dropdowns
  const { data: students = [] } = useQuery({
    queryKey: ['students-list'],
    queryFn: () => get<any[]>('/students?limit=100'),
  });

  const { data: courses = [] } = useQuery({
    queryKey: ['courses-list'],
    queryFn: () => get<any[]>('/courses'),
  });

  // Create Invoice Mutation
  const createInvoiceMutation = useMutation({
    mutationFn: (payload: any) => post('/fees/invoices', payload),
    onSuccess: () => {
      toast.success('Fee invoice created successfully');
      queryClient.invalidateQueries({ queryKey: ['fee-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fee-stats'] });
      setIsCreateInvoiceOpen(false);
      setInvoiceForm({
        studentId: '',
        courseId: '',
        title: '',
        feeType: 'TUITION',
        amount: '',
        discount: '0',
        dueDate: '',
        notes: '',
      });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create invoice');
    },
  });

  // Delete Invoice Mutation
  const deleteInvoiceMutation = useMutation({
    mutationFn: (id: string) => del(`/fees/invoices/${id}`),
    onSuccess: () => {
      toast.success('Invoice deleted');
      queryClient.invalidateQueries({ queryKey: ['fee-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fee-stats'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete invoice');
    },
  });

  // Record Payment Mutation
  const recordPaymentMutation = useMutation({
    mutationFn: (payload: any) => post('/fees/payments', payload),
    onSuccess: (res: any) => {
      toast.success('Payment recorded successfully');
      queryClient.invalidateQueries({ queryKey: ['fee-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['fee-payments'] });
      queryClient.invalidateQueries({ queryKey: ['fee-stats'] });
      setIsCollectPaymentOpen(false);
      // Auto open printable receipt
      if (res) {
        setActiveReceiptPayment(res);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to record payment');
    },
  });

  // Handlers
  const handleOpenCollectPayment = (invoice: FeeInvoiceRecord) => {
    setSelectedInvoiceForPayment(invoice);
    setPaymentForm({
      invoiceId: invoice.id,
      amount: String(invoice.dueAmount),
      method: 'CASH',
      transactionId: '',
      paymentDate: new Date().toISOString().split('T')[0],
      notes: '',
    });
    setIsCollectPaymentOpen(true);
  };

  const handleCourseSelect = (courseId: string) => {
    const selected = courses.find((c: any) => c.id === courseId);
    if (selected) {
      setInvoiceForm((prev) => ({
        ...prev,
        courseId,
        title: prev.title || `Course Fee - ${selected.name}`,
        amount: prev.amount || String(selected.fees),
      }));
    } else {
      setInvoiceForm((prev) => ({ ...prev, courseId }));
    }
  };

  const handleCreateInvoiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceForm.studentId) {
      toast.error('Please select a student');
      return;
    }
    if (!invoiceForm.title.trim()) {
      toast.error('Invoice title is required');
      return;
    }
    if (!invoiceForm.amount || Number(invoiceForm.amount) < 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    createInvoiceMutation.mutate({
      studentId: invoiceForm.studentId,
      courseId: invoiceForm.courseId || undefined,
      title: invoiceForm.title.trim(),
      feeType: invoiceForm.feeType,
      amount: Number(invoiceForm.amount),
      discount: Number(invoiceForm.discount || 0),
      dueDate: invoiceForm.dueDate ? new Date(invoiceForm.dueDate).toISOString() : undefined,
      notes: invoiceForm.notes.trim() || undefined,
    });
  };

  const handleCollectPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(paymentForm.amount);
    if (!amt || amt <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }
    if (selectedInvoiceForPayment && amt > selectedInvoiceForPayment.dueAmount) {
      toast.error(`Amount exceeds remaining due (৳${selectedInvoiceForPayment.dueAmount})`);
      return;
    }

    recordPaymentMutation.mutate({
      invoiceId: paymentForm.invoiceId,
      amount: amt,
      method: paymentForm.method,
      transactionId: paymentForm.transactionId.trim() || undefined,
      paymentDate: paymentForm.paymentDate ? new Date(paymentForm.paymentDate).toISOString() : undefined,
      notes: paymentForm.notes.trim() || undefined,
    });
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700">Paid</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge className="bg-amber-600 hover:bg-amber-700">Partially Paid</Badge>;
      case 'OVERDUE':
        return <Badge variant="destructive">Overdue</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline">Cancelled</Badge>;
      case 'UNPAID':
      default:
        return <Badge variant="secondary" className="text-rose-600 dark:text-rose-400 border-rose-200">Unpaid</Badge>;
    }
  };

  const getMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case 'BKASH':
        return <Badge className="bg-pink-600 hover:bg-pink-700 font-mono text-[10px]">bKash</Badge>;
      case 'NAGAD':
        return <Badge className="bg-orange-600 hover:bg-orange-700 font-mono text-[10px]">Nagad</Badge>;
      case 'CARD':
        return <Badge className="bg-purple-600 hover:bg-purple-700 font-mono text-[10px]">Card</Badge>;
      case 'BANK_TRANSFER':
        return <Badge className="bg-blue-600 hover:bg-blue-700 font-mono text-[10px]">Bank</Badge>;
      case 'CASH':
      default:
        return <Badge variant="outline" className="font-mono text-[10px]">Cash</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fees & Financials</h1>
          <p className="text-muted-foreground text-sm">
            Manage course billing, fee invoices, automated receipts, and student payment collections.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCreateInvoiceOpen(true)} className="gap-1.5">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ৳{(stats?.totalInvoiced ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalInvoicesCount ?? 0} invoices issued
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Collected</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              ৳{(stats?.totalCollected ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalPaymentsCount ?? 0} payment transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding Dues</CardTitle>
            <Wallet className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              ৳{(stats?.totalOutstanding ?? 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Pending collections</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {stats?.overdueCount ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Exceeded payment due date</p>
          </CardContent>
        </Card>
      </div>

      {/* Segmented Navigation Tabs */}
      <div className="flex border-b space-x-4">
        <button
          onClick={() => setActiveTab('invoices')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'invoices'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <CreditCard className="h-4 w-4" />
          Invoices & Billing ({invoicesData?.meta?.total ?? 0})
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`pb-3 text-sm font-medium transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'border-primary text-primary font-semibold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Receipt className="h-4 w-4" />
          Payment Transactions ({paymentsData?.meta?.total ?? 0})
        </button>
      </div>

      {/* Tab 1: Invoices */}
      {activeTab === 'invoices' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search invoice #, student, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <select
                value={invoiceStatus}
                onChange={(e) => setInvoiceStatus(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs ring-offset-background"
              >
                <option value="ALL">All Statuses</option>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIALLY_PAID">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="OVERDUE">Overdue</option>
              </select>

              <select
                value={invoiceType}
                onChange={(e) => setInvoiceType(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-xs ring-offset-background"
              >
                <option value="ALL">All Types</option>
                <option value="ADMISSION">Admission</option>
                <option value="TUITION">Tuition</option>
                <option value="EXAM">Exam</option>
                <option value="MATERIALS">Materials</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
          </div>

          {/* Invoices Table Card */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Invoice #</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Student</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Title / Purpose</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground">Total</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground">Paid</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground">Due</th>
                      <th className="py-3 px-4 text-center font-medium text-muted-foreground">Status</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Due Date</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoadingInvoices ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-muted-foreground">
                          Loading invoices...
                        </td>
                      </tr>
                    ) : !invoicesData?.data || invoicesData.data.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10">
                          <Receipt className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                          <p className="font-medium text-sm">No invoices found</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Create your first invoice or admit a student with course fees.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      invoicesData.data.map((inv) => (
                        <tr key={inv.id} className="hover:bg-muted/10 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-foreground">
                            {inv.invoiceNumber}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium">
                              {inv.student?.firstName} {inv.student?.lastName}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {inv.student?.studentId} • {inv.student?.phone}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium">{inv.title}</span>
                            <div className="text-[11px] text-muted-foreground">
                              {inv.course?.name || inv.feeType}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-medium">
                            ৳{inv.totalAmount.toLocaleString()}
                            {inv.discount > 0 && (
                              <div className="text-[10px] text-emerald-600">
                                Disc: -৳{inv.discount}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                            ৳{inv.paidAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-amber-600">
                            ৳{inv.dueAmount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getStatusBadge(inv.status)}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString() : '—'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {inv.dueAmount > 0 && (
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-7 text-xs px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700"
                                  onClick={() => handleOpenCollectPayment(inv)}
                                >
                                  <ArrowDownLeft className="h-3 w-3" /> Collect
                                </Button>
                              )}
                              {inv.paidAmount === 0 && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to delete invoice ${inv.invoiceNumber}?`)) {
                                      deleteInvoiceMutation.mutate(inv.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 2: Payments History */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">
              Recent payment collections and digital money receipts.
            </div>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs ring-offset-background"
            >
              <option value="ALL">All Payment Methods</option>
              <option value="CASH">Cash</option>
              <option value="BKASH">bKash</option>
              <option value="NAGAD">Nagad</option>
              <option value="CARD">Card</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Receipt #</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Date</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Student</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Invoice Reference</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground">Amount Paid</th>
                      <th className="py-3 px-4 text-center font-medium text-muted-foreground">Method</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Transaction ID</th>
                      <th className="py-3 px-4 text-left font-medium text-muted-foreground">Collected By</th>
                      <th className="py-3 px-4 text-right font-medium text-muted-foreground">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {isLoadingPayments ? (
                      <tr>
                        <td colSpan={9} className="text-center py-8 text-muted-foreground">
                          Loading payment transactions...
                        </td>
                      </tr>
                    ) : !paymentsData?.data || paymentsData.data.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="text-center py-10">
                          <Receipt className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
                          <p className="font-medium text-sm">No payment records found</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Collected payments will be archived here with printable digital receipts.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      paymentsData.data.map((pmt) => (
                        <tr key={pmt.id} className="hover:bg-muted/10 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-foreground">
                            {pmt.receiptNumber}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {new Date(pmt.paymentDate).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium">
                              {pmt.student?.firstName} {pmt.student?.lastName}
                            </span>
                            <div className="text-[11px] text-muted-foreground">
                              {pmt.student?.studentId}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-medium">
                              {pmt.invoice?.invoiceNumber}
                            </span>
                            <div className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                              {pmt.invoice?.title}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-emerald-600 text-sm">
                            ৳{pmt.amount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getMethodBadge(pmt.method)}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground">
                            {pmt.transactionId || '—'}
                          </td>
                          <td className="py-3 px-4 text-muted-foreground">
                            {pmt.receivedBy ? `${pmt.receivedBy.firstName} ${pmt.receivedBy.lastName}` : 'System'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs px-2 gap-1"
                              onClick={() => setActiveReceiptPayment(pmt)}
                            >
                              <Receipt className="h-3 w-3" /> View
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal 1: Create Invoice */}
      <Dialog open={isCreateInvoiceOpen} onOpenChange={setIsCreateInvoiceOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleCreateInvoiceSubmit}>
            <DialogHeader>
              <DialogTitle>Create Fee Invoice</DialogTitle>
              <DialogDescription>
                Issue a new billing invoice for tuition, admission, or other charges.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Select Student */}
              <div className="space-y-1.5">
                <Label htmlFor="studentId">Select Student *</Label>
                <select
                  id="studentId"
                  value={invoiceForm.studentId}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, studentId: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs ring-offset-background"
                  required
                >
                  <option value="">Choose a student...</option>
                  {students.map((st: any) => (
                    <option key={st.id} value={st.id}>
                      {st.firstName} {st.lastName} ({st.studentId} - {st.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Course Selection */}
              <div className="space-y-1.5">
                <Label htmlFor="courseId">Related Course (Optional)</Label>
                <select
                  id="courseId"
                  value={invoiceForm.courseId}
                  onChange={(e) => handleCourseSelect(e.target.value)}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs ring-offset-background"
                >
                  <option value="">None / Custom charge</option>
                  {courses.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (৳{c.fees})
                    </option>
                  ))}
                </select>
              </div>

              {/* Invoice Title */}
              <div className="space-y-1.5">
                <Label htmlFor="invTitle">Invoice Title *</Label>
                <Input
                  id="invTitle"
                  placeholder="e.g. Monthly Tuition Fee - October"
                  value={invoiceForm.title}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, title: e.target.value })}
                  required
                />
              </div>

              {/* Fee Type & Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="feeType">Fee Type</Label>
                  <select
                    id="feeType"
                    value={invoiceForm.feeType}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, feeType: e.target.value })}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs ring-offset-background"
                  >
                    <option value="TUITION">Tuition</option>
                    <option value="ADMISSION">Admission</option>
                    <option value="EXAM">Exam</option>
                    <option value="MATERIALS">Materials</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={invoiceForm.dueDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Amount & Discount */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Gross Amount (৳) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    placeholder="5000"
                    value={invoiceForm.amount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="discount">Discount / Waiver (৳)</Label>
                  <Input
                    id="discount"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={invoiceForm.discount}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, discount: e.target.value })}
                  />
                </div>
              </div>

              {/* Net Payable Preview */}
              <div className="p-2.5 rounded-lg bg-muted/40 border flex justify-between items-center text-xs">
                <span className="text-muted-foreground font-medium">Net Payable:</span>
                <span className="font-bold text-sm text-foreground">
                  ৳{Math.max(0, (Number(invoiceForm.amount) || 0) - (Number(invoiceForm.discount) || 0)).toLocaleString()}
                </span>
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes / Remarks</Label>
                <Input
                  id="notes"
                  placeholder="Additional payment terms or invoice notes..."
                  value={invoiceForm.notes}
                  onChange={(e) => setInvoiceForm({ ...invoiceForm, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCreateInvoiceOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createInvoiceMutation.isPending}>
                {createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal 2: Collect Payment */}
      <Dialog open={isCollectPaymentOpen} onOpenChange={setIsCollectPaymentOpen}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleCollectPaymentSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowDownLeft className="h-5 w-5 text-emerald-600" />
                Collect Payment
              </DialogTitle>
              <DialogDescription>
                Record a payment for invoice {selectedInvoiceForPayment?.invoiceNumber}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              {/* Invoice Summary */}
              {selectedInvoiceForPayment && (
                <div className="p-3 rounded-lg bg-muted/40 border space-y-1">
                  <div className="font-semibold text-foreground">
                    {selectedInvoiceForPayment.student?.firstName} {selectedInvoiceForPayment.student?.lastName}
                  </div>
                  <div className="text-muted-foreground">
                    {selectedInvoiceForPayment.title}
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t mt-2">
                    <span className="text-muted-foreground">Remaining Due:</span>
                    <span className="text-base font-bold text-amber-600">
                      ৳{selectedInvoiceForPayment.dueAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Payment Amount */}
              <div className="space-y-1.5">
                <Label htmlFor="pmtAmount">Payment Amount (৳) *</Label>
                <Input
                  id="pmtAmount"
                  type="number"
                  min="1"
                  step="any"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  required
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <Label htmlFor="pmtMethod">Payment Method *</Label>
                <select
                  id="pmtMethod"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs ring-offset-background"
                >
                  <option value="CASH">Cash</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              {/* TrxID / Ref */}
              {paymentForm.method !== 'CASH' && (
                <div className="space-y-1.5">
                  <Label htmlFor="trxId">Transaction ID / TrxID</Label>
                  <Input
                    id="trxId"
                    placeholder="e.g. 9J28DA10B or Bank deposit slip #"
                    value={paymentForm.transactionId}
                    onChange={(e) => setPaymentForm({ ...paymentForm, transactionId: e.target.value })}
                  />
                </div>
              )}

              {/* Payment Date */}
              <div className="space-y-1.5">
                <Label htmlFor="pmtDate">Payment Date</Label>
                <Input
                  id="pmtDate"
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                />
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <Label htmlFor="pmtNotes">Remarks / Receipt Note</Label>
                <Input
                  id="pmtNotes"
                  placeholder="Optional collection note..."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCollectPaymentOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={recordPaymentMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {recordPaymentMutation.isPending ? 'Processing...' : 'Confirm Payment'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Digital Receipt Modal */}
      <PaymentReceiptModal
        isOpen={Boolean(activeReceiptPayment)}
        onClose={() => setActiveReceiptPayment(null)}
        payment={activeReceiptPayment}
      />
    </div>
  );
}
