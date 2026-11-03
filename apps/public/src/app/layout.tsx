import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Geist, Geist_Mono } from 'next/font/google';
import { getTenantConfig } from '@/lib/server-api';
import { PublicHeader } from '@/components/public-header';
import { PublicFooter } from '@/components/public-footer';
import '@/styles/globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export async function generateMetadata(): Promise<Metadata> {
  const config = await getTenantConfig();
  if (!config) {
    return {
      title: 'Institute Portal | EduManage',
      description: 'Public education portal and admissions',
    };
  }
  return {
    title: `${config.name} | Official Institute Portal`,
    description: config.themeConfig.aboutText || `Welcome to ${config.name} public portal. Explore courses, apply online, and verify credentials.`,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  const config = await getTenantConfig();

  const primaryColor = config?.themeConfig?.primaryColor || '#2563eb';
  const accentColor = config?.themeConfig?.accentColor || '#f59e0b';
  const tenantName = config?.name || 'EduManage Institute';
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3000';

  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              :root {
                --tenant-primary: ${primaryColor};
                --tenant-accent: ${accentColor};
              }
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased min-h-screen flex flex-col bg-slate-50/50 text-slate-900`}>
        <NextIntlClientProvider messages={messages}>
          <PublicHeader
            tenantName={tenantName}
            logoUrl={config?.themeConfig?.logoUrl}
            adminUrl={adminUrl}
          />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
          <PublicFooter config={config} />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
