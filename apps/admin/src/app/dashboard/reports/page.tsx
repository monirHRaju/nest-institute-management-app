'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  DollarSign,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

export default function ReportsPage() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const { data: revenue, isLoading } = useQuery({
    queryKey: ['fees-revenue-report', from, to],
    queryFn: () => {
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const q = qs.toString();
      return get<any>(`/fees/revenue${q ? `?${q}` : ''}`);
    },
  });

  const kpis = revenue?.kpis;
  const trend = revenue?.monthlyTrend || [];
  const expensesByCategory: Record<string, number> =
    revenue?.expensesByCategory || {};

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">
            Revenue &amp; Profit/Loss Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Track fee collections, pending dues, operational expenses, and
            12-month financial trends.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            className="h-9 w-36 text-xs"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className="h-9 w-36 text-xs"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
          {(from || to) && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setFrom('');
                setTo('');
              }}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          Loading financial analytics...
        </p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Total Revenue Collected
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  ৳{Number(kpis?.totalCollected || 0).toLocaleString('en-BD')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total Billed: ৳
                  {Number(kpis?.totalBilled || 0).toLocaleString('en-BD')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                <CardTitle className="text-sm font-medium">
                  Pending &amp; Overdue Dues
                </CardTitle>
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  ৳{Number(kpis?.pendingDues || 0).toLocaleString('en-BD')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Overdue ({kpis?.overdueCount || 0}): ৳
                  {Number(kpis?.overdueDues || 0).toLocaleString('en-BD')}
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
                  ৳{Number(kpis?.totalExpenses || 0).toLocaleString('en-BD')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  This Month: ৳
                  {Number(kpis?.monthlyExpenses || 0).toLocaleString('en-BD')}
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
                    (kpis?.netProfit || 0) >= 0
                      ? 'text-emerald-600'
                      : 'text-destructive'
                  }`}
                >
                  {(kpis?.netProfit || 0) >= 0 ? '+' : ''}৳
                  {Number(kpis?.netProfit || 0).toLocaleString('en-BD')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Income minus operational expenses
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">
                  12-Month Income vs Expenses Trend (BDT ৳)
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="month" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip
                      formatter={(val: any) => [
                        `৳${Number(val).toLocaleString('en-BD')}`,
                      ]}
                    />
                    <Legend />
                    <Bar
                      dataKey="collected"
                      name="Collected Income (৳)"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="expenses"
                      name="Expenses (৳)"
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Expenses Breakdown by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.keys(expensesByCategory).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No expenses recorded yet.
                  </p>
                ) : (
                  Object.entries(expensesByCategory).map(([cat, amt]) => (
                    <div
                      key={cat}
                      className="flex items-center justify-between border-b pb-2 text-sm"
                    >
                      <span className="font-medium">{cat}</span>
                      <span className="font-semibold text-destructive">
                        ৳{Number(amt).toLocaleString('en-BD')}
                      </span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
