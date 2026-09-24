'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Users, BookOpen, CreditCard, Calendar } from 'lucide-react';

export default function DashboardPage() {
  const t = useTranslations('nav');
  const { user } = useAuth();
  
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  // Dummy stat data for UI shell
  const stats = isSuperAdmin
    ? [
        { title: t('tenants'), value: '12', icon: Users },
        { title: 'Total Revenue', value: '৳ 2.4M', icon: CreditCard },
      ]
    : [
        { title: t('students'), value: '1,234', icon: Users },
        { title: t('courses'), value: '25', icon: BookOpen },
        { title: t('batches'), value: '42', icon: Calendar },
        { title: t('fees'), value: '৳ 450K', icon: CreditCard },
      ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.firstName}!
        </h1>
        <p className="text-muted-foreground mt-2">
          Here's an overview of your {isSuperAdmin ? 'platform' : 'institute'}.
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
    </div>
  );
}
