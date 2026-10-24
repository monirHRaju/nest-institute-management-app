'use client';

import { useTranslations } from 'next-intl';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  CreditCard,
  ClipboardList,
  BarChart,
  Settings,
  LogOut,
  LayoutDashboard,
  Tags,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/use-auth';
import { apiClient } from '@/lib/api';
import { useRouter } from 'next/navigation';

export function AppSidebar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      // ignore
    }
    document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    router.push('/login');
  };

  // Define nav items based on role
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const isInstructor = user?.role === 'INSTRUCTOR';

  let items = [
    { title: t('dashboard'), url: '/dashboard', icon: LayoutDashboard },
    { title: t('students'), url: '/dashboard/students', icon: Users },
    { title: t('instructors'), url: '/dashboard/instructors', icon: GraduationCap },
    { title: 'Categories', url: '/dashboard/categories', icon: Tags },
    { title: t('courses'), url: '/dashboard/courses', icon: BookOpen },
    { title: t('batches'), url: '/dashboard/batches', icon: Calendar },
    { title: t('fees'), url: '/dashboard/fees', icon: CreditCard },
    { title: t('attendance'), url: '/dashboard/attendance', icon: ClipboardList },
    { title: t('reports'), url: '/dashboard/reports', icon: BarChart },
    { title: t('settings'), url: '/dashboard/settings', icon: Settings },
  ];

  if (isSuperAdmin) {
    items = [
      { title: t('dashboard'), url: '/dashboard', icon: LayoutDashboard },
      { title: t('tenants'), url: '/dashboard/tenants', icon: Building2 },
      { title: t('settings'), url: '/dashboard/settings', icon: Settings },
    ];
  } else if (isInstructor) {
    items = [
      { title: t('dashboard'), url: '/dashboard', icon: LayoutDashboard },
      { title: t('batches'), url: '/dashboard/batches', icon: Calendar },
      { title: t('attendance'), url: '/dashboard/attendance', icon: ClipboardList },
      { title: t('students'), url: '/dashboard/students', icon: Users },
    ];
  }

  if (isLoading) return <Sidebar />;

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 font-bold text-xl">
          <Building2 className="h-6 w-6 text-primary" />
          <span>EduManage</span>
        </div>
        {user && !isSuperAdmin && (
          <div className="text-xs text-muted-foreground mt-1">
            {user.role} • {user.email}
          </div>
        )}
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout}>
              <LogOut />
              <span>{t('logout')}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
