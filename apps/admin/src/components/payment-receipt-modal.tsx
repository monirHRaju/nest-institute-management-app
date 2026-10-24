'use client';

import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, CheckCircle2, Building2 } from 'lucide-react';
import type { PaymentRecord } from '@repo/shared';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: PaymentRecord | null;
  tenantName?: string;
}

export function PaymentReceiptModal({
  isOpen,
  onClose,
  payment,
  tenantName = 'EduManage Institute',
}: PaymentReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!payment) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(payment.paymentDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl p-0 overflow-hidden sm:rounded-xl">
        <DialogHeader className="p-6 pb-2 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-bold">Payment Receipt</DialogTitle>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {payment.receiptNumber}
            </Badge>
          </div>
        </DialogHeader>

        {/* Printable Area */}
        <div ref={printRef} className="p-6 space-y-6 printable-receipt text-sm">
          {/* Header */}
          <div className="text-center pb-4 border-b">
            <h2 className="text-xl font-bold tracking-tight text-foreground">{tenantName}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Official Money Receipt</p>
            <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Payment Successful
            </div>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-muted-foreground">Receipt Number:</span>
              <p className="font-semibold font-mono">{payment.receiptNumber}</p>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-muted-foreground">Date & Time:</span>
              <p className="font-semibold">{formattedDate}</p>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground">Student:</span>
              <p className="font-semibold text-foreground">
                {payment.student?.firstName} {payment.student?.lastName}
              </p>
              <p className="text-muted-foreground">ID: {payment.student?.studentId} | {payment.student?.phone}</p>
            </div>
            <div className="space-y-1 text-right">
              <span className="text-muted-foreground">Invoice Reference:</span>
              <p className="font-semibold font-mono">{payment.invoice?.invoiceNumber || 'N/A'}</p>
              <p className="text-muted-foreground truncate">{payment.invoice?.title || ''}</p>
            </div>
          </div>

          {/* Payment Breakdown Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b">
                <tr>
                  <th className="py-2 px-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="py-2 px-3 text-right font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-foreground">
                      {payment.invoice?.title || 'Course / Tuition Fee Payment'}
                    </span>
                    {payment.notes && (
                      <p className="text-xs text-muted-foreground mt-0.5">Note: {payment.notes}</p>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold">
                    ৳{payment.amount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
              <tfoot className="bg-muted/20 border-t font-semibold">
                <tr>
                  <td className="py-2.5 px-3 text-foreground">Total Paid This Receipt:</td>
                  <td className="py-2.5 px-3 text-right text-base font-bold text-emerald-600">
                    ৳{payment.amount.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Transaction & Method Info */}
          <div className="p-3 rounded-lg bg-muted/30 border space-y-1.5 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Payment Method:</span>
              <Badge variant="secondary" className="font-semibold uppercase tracking-wider text-[10px]">
                {payment.method.replace('_', ' ')}
              </Badge>
            </div>
            {payment.transactionId && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Transaction ID / Ref:</span>
                <span className="font-mono font-medium">{payment.transactionId}</span>
              </div>
            )}
            {payment.receivedBy && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Collected By:</span>
                <span>
                  {payment.receivedBy.firstName} {payment.receivedBy.lastName}
                </span>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="text-center text-[11px] text-muted-foreground pt-2 border-t">
            <p>Thank you for your payment. This is a computer generated receipt.</p>
          </div>
        </div>

        {/* Modal Footer */}
        <DialogFooter className="p-4 border-t bg-muted/10 gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button size="sm" onClick={handlePrint} className="gap-1.5">
            <Printer className="h-3.5 w-3.5" />
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
