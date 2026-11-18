'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Printer, X } from 'lucide-react';

interface PayslipPrintModalProps {
  payslip: any | null;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function PayslipPrintModal({ payslip, onClose }: PayslipPrintModalProps) {
  if (!payslip) return null;

  const staffName = payslip.staff?.user
    ? `${payslip.staff.user.firstName} ${payslip.staff.user.lastName}`
    : 'Staff Member';

  const monthLabel = `${MONTH_NAMES[(payslip.month || 1) - 1]} ${payslip.year}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 print:bg-white print:p-0">
      <Card className="w-full max-w-2xl shadow-xl max-h-[92vh] overflow-y-auto print:shadow-none print:border-0 print:max-w-none print:max-h-none">
        <CardHeader className="flex flex-row items-center justify-between border-b print:hidden">
          <CardTitle className="text-lg">Salary Payslip — {monthLabel}</CardTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1.5" /> Print / Save PDF
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b pb-4">
            <div>
              <h2 className="text-2xl font-bold text-primary">
                {payslip.tenant?.name || 'Institute Management'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Official Salary Payslip
              </p>
            </div>
            <div className="sm:text-right">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Pay Period
              </div>
              <div className="text-lg font-bold">{monthLabel}</div>
              <div className="mt-1">
                <Badge variant={payslip.status === 'PAID' ? 'default' : 'secondary'}>
                  {payslip.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-muted-foreground">Employee Name</div>
              <div className="font-semibold">{staffName}</div>
              <div className="text-xs text-muted-foreground">
                {payslip.staff?.user?.email}
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-muted-foreground">Designation</div>
              <div className="font-semibold">{payslip.staff?.designation}</div>
              {payslip.staff?.department && (
                <div className="text-xs text-muted-foreground">
                  {payslip.staff.department}
                </div>
              )}
            </div>
            {payslip.paidAt && (
              <div>
                <div className="text-muted-foreground">Paid On</div>
                <div className="font-medium">
                  {new Date(payslip.paidAt).toLocaleDateString()}
                </div>
              </div>
            )}
            {payslip.method && (
              <div className="sm:text-right">
                <div className="text-muted-foreground">Payment Method</div>
                <div className="font-medium">{payslip.method}</div>
              </div>
            )}
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="py-2.5 px-4 text-left font-medium">Component</th>
                  <th className="py-2.5 px-4 text-right font-medium">Amount (৳)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="py-2.5 px-4">Base Salary</td>
                  <td className="py-2.5 px-4 text-right font-medium">
                    ৳{Number(payslip.baseAmount).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4">Allowances</td>
                  <td className="py-2.5 px-4 text-right text-emerald-600">
                    +৳{Number(payslip.allowances).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4">Bonus</td>
                  <td className="py-2.5 px-4 text-right text-emerald-600">
                    +৳{Number(payslip.bonus).toLocaleString()}
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-4">Deductions</td>
                  <td className="py-2.5 px-4 text-right text-rose-600">
                    -৳{Number(payslip.deductions).toLocaleString()}
                  </td>
                </tr>
                <tr className="bg-muted/30 font-bold text-base">
                  <td className="py-3 px-4">Net Payable</td>
                  <td className="py-3 px-4 text-right">
                    ৳{Number(payslip.netAmount).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {payslip.note && (
            <div className="text-xs text-muted-foreground border-t pt-3">
              <span className="font-semibold">Note:</span> {payslip.note}
            </div>
          )}

          <div className="flex justify-between pt-8 text-xs text-muted-foreground">
            <div className="border-t pt-1 w-40 text-center">Employee Signature</div>
            <div className="border-t pt-1 w-40 text-center">Authorized Signature</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
