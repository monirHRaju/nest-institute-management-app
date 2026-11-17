'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, X } from 'lucide-react';

interface InvoicePrintModalProps {
  invoice: any | null;
  onClose: () => void;
}

export function InvoicePrintModal({ invoice, onClose }: InvoicePrintModalProps) {
  if (!invoice) return null;

  const totalAmount = Number(invoice.amount || 0);
  const discount = Number(invoice.discount || 0);
  const paidAmount = Number(invoice.paidAmount || 0);
  const dueBalance = Math.max(0, Number((totalAmount - paidAmount).toFixed(2)));
  const grossBeforeDiscount = Number((totalAmount + discount).toFixed(2));

  const studentName = invoice.student?.user
    ? `${invoice.student.user.firstName} ${invoice.student.user.lastName}`
    : 'Student';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:bg-white print:p-0">
      <Card className="w-full max-w-2xl shadow-xl max-h-[92vh] overflow-y-auto print:shadow-none print:border-0 print:max-w-none print:max-h-none">
        <CardHeader className="flex flex-row items-center justify-between border-b print:hidden">
          <CardTitle className="text-lg">
            Invoice &amp; Payment Receipt — {invoice.invoiceNo}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1.5" /> Print / Save PDF
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Header Branding */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold text-primary">
                {invoice.tenant?.name || 'Institute Management'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official Fee Invoice &amp; Statement
              </p>
            </div>
            <div className="sm:text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Invoice Number
              </div>
              <div className="text-lg font-mono font-bold">
                {invoice.invoiceNo}
              </div>
              <div className="mt-1">
                <Badge
                  variant={
                    invoice.status === 'PAID'
                      ? 'default'
                      : invoice.status === 'OVERDUE'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {invoice.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Student & Dates Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Billed To
              </div>
              <div className="font-semibold text-base">{studentName}</div>
              {invoice.student?.user?.phone && (
                <div>Phone: {invoice.student.user.phone}</div>
              )}
              {invoice.student?.user?.email && (
                <div className="text-muted-foreground">
                  {invoice.student.user.email}
                </div>
              )}
              {invoice.student?.batch && (
                <div className="text-xs text-muted-foreground pt-1">
                  Course: {invoice.student.batch.course?.name || '—'} | Batch:{' '}
                  {invoice.student.batch.name}
                </div>
              )}
            </div>

            <div className="sm:text-right space-y-1">
              <div>
                <span className="text-muted-foreground">Issue Date: </span>
                <span className="font-medium">
                  {new Date(invoice.createdAt).toLocaleDateString('en-GB')}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Due Date: </span>
                <span className="font-medium">
                  {new Date(invoice.dueDate).toLocaleDateString('en-GB')}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Installment: </span>
                <span className="font-medium">#{invoice.installmentNo}</span>
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="border rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="py-2.5 px-4 text-left font-medium">
                    Description
                  </th>
                  <th className="py-2.5 px-4 text-right font-medium">
                    Amount (BDT)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-3 px-4">
                    <div className="font-medium">
                      {invoice.title || 'Course Tuition Fee'}
                    </div>
                    {invoice.assignment?.structure?.name && (
                      <div className="text-xs text-muted-foreground">
                        Fee Plan: {invoice.assignment.structure.name}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-medium">
                    ৳{grossBeforeDiscount.toLocaleString('en-BD')}
                  </td>
                </tr>
                {discount > 0 && (
                  <tr>
                    <td className="py-2.5 px-4 text-emerald-600">
                      Discount / Scholarship Applied
                    </td>
                    <td className="py-2.5 px-4 text-right text-emerald-600">
                      - ৳{discount.toLocaleString('en-BD')}
                    </td>
                  </tr>
                )}
              </tbody>
              <tfoot className="bg-muted/30 border-t text-sm">
                <tr>
                  <td className="py-2 px-4 text-right font-medium">
                    Net Payable:
                  </td>
                  <td className="py-2 px-4 text-right font-bold">
                    ৳{totalAmount.toLocaleString('en-BD')}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 text-right font-medium text-emerald-600">
                    Total Paid:
                  </td>
                  <td className="py-2 px-4 text-right font-semibold text-emerald-600">
                    ৳{paidAmount.toLocaleString('en-BD')}
                  </td>
                </tr>
                <tr className="border-t">
                  <td className="py-2.5 px-4 text-right font-bold">
                    Balance Due:
                  </td>
                  <td className="py-2.5 px-4 text-right font-bold text-base">
                    ৳{dueBalance.toLocaleString('en-BD')}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Payment Transactions
              </div>
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 border-b">
                    <tr>
                      <th className="py-2 px-3 text-left">Receipt #</th>
                      <th className="py-2 px-3 text-left">Date</th>
                      <th className="py-2 px-3 text-left">Method</th>
                      <th className="py-2 px-3 text-left">Reference</th>
                      <th className="py-2 px-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoice.payments.map((p: any) => (
                      <tr key={p.id}>
                        <td className="py-2 px-3 font-mono">{p.receiptNo}</td>
                        <td className="py-2 px-3">
                          {new Date(p.paidAt).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-2 px-3">{p.method}</td>
                        <td className="py-2 px-3">{p.reference || '—'}</td>
                        <td className="py-2 px-3 text-right font-semibold">
                          ৳{Number(p.amount).toLocaleString('en-BD')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="border-t pt-4 flex justify-between items-center text-xs text-muted-foreground">
            <span>Generated by EduManage Accounting</span>
            <span>Currency: BDT (৳)</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
