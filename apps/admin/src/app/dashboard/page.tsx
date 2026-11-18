'use client';

import { useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import {
  Users,
  BookOpen,
  CreditCard,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
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

export default function DashboardPage() {
  const t = useTranslations('nav');
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const canViewRevenue =
    user?.role === 'TENANT_ADMIN' || user?.role === 'STAFF';

  const { data: revenue } = useQuery({
    queryKey: ['fees-revenue-dashboard'],
    queryFn: () => get<any>('/fees/revenue'),
    enabled: Boolean(canViewRevenue),
  });

  const { data: platformStats } = useQuery({
    queryKey: ['platform-tenant-stats'],
    queryFn: () => get<any>('/tenants/stats'),
    enabled: Boolean(isSuperAdmin),
  });

  const kpis = revenue?.kpis;

  const stats = isSuperAdmin
    ? [
        {
          title: t('tenants'),
          value:
            platformStats?.totalTenants !== undefined
              ? String(platformStats.totalTenants)
              : '—',
          icon: Users,
        },
        {
          title: 'Active Institutes',
          value:
            platformStats?.byStatus?.ACTIVE !== undefined
              ? String(platformStats.byStatus.ACTIVE)
              : '—',
          icon: BookOpen,
        },
        {
          title: 'Platform Students',
          value:
            platformStats?.totalStudents !== undefined
              ? String(platformStats.totalStudents)
              : '—',
          icon: Users,
        },
        {
          title: 'Platform Fee Volume',
          value:
            platformStats?.totalPlatformRevenue !== undefined
              ? `৳${Number(platformStats.totalPlatformRevenue).toLocaleString('en-BD')}`
              : '৳0',
          icon: CreditCard,
        },
      ]
    : [
        {
          title: t('students'),
          value:
            kpis?.totalStudents !== undefined
              ? String(kpis.totalStudents)
              : '—',
          icon: Users,
        },
        {
          title: t('batches'),
          value:
            kpis?.activeBatches !== undefined
              ? String(kpis.activeBatches)
              : '—',
          icon: Calendar,
        },
        {
          title: 'Monthly Revenue (৳)',
          value:
            kpis?.monthlyCollected !== undefined
              ? `৳${Number(kpis.monthlyCollected).toLocaleString('en-BD')}`
              : '৳0',
          icon: CreditCard,
        },
        {
          title: 'Pending Dues (৳)',
          value:
            kpis?.pendingDues !== undefined
              ? `৳${Number(kpis.pendingDues).toLocaleString('en-BD')}`
              : '৳0',
          icon: AlertTriangle,
        },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Here&apos;s an overview of your{' '}
          {isSuperAdmin ? 'platform' : 'institute'}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {canViewRevenue && revenue?.monthlyTrend && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Monthly Revenue vs Expenses (BDT ৳)
            </CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenue.monthlyTrend}>
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
                  name="Collected (৳)"
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
      )}
    </div>
  );
}
