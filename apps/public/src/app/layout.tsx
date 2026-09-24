import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Geist, Geist_Mono } from 'next/font/google';
import { getTenantConfig } from '@/lib/api';
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
    return { title: 'Institute Not Found' };
  }
  return {
    title: `${config.name} | EduManage Portal`,
    description: config.themeConfig.aboutText || 'Welcome to our institute portal',
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();
  const config = await getTenantConfig();

  // If no tenant config, we'll still render the shell but the page can handle the 404 state
  const primaryColor = config?.themeConfig.primaryColor || '#2563eb';
  const accentColor = config?.themeConfig.accentColor || '#f59e0b';

  return (
    <html lang="en">
      <head>
        <style dangerouslySetInnerHTML={{
          __html: `
            :root {
              --tenant-primary: ${primaryColor};
              --tenant-accent: ${accentColor};
            }
          `
        }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col`}>
        <NextIntlClientProvider messages={messages}>
          <header className="bg-[var(--tenant-primary)] text-white p-4 shadow-md">
            <div className="container mx-auto font-bold text-xl flex justify-between items-center">
              <span>{config ? config.name : 'EduManage'}</span>
              <nav className="text-sm font-medium space-x-4 hidden md:block">
                <a href="#" className="hover:underline">Home</a>
                <a href="#" className="hover:underline">Courses</a>
                <a href="#" className="hover:underline">Contact</a>
                <a href={process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3000'} className="hover:underline opacity-80">Portal Login</a>
              </nav>
            </div>
          </header>
          
          <main className="flex-1">
            {children}
          </main>
          
          <footer className="bg-gray-900 text-gray-300 py-8 text-center text-sm">
            <div className="container mx-auto">
              <p>&copy; {new Date().getFullYear()} {config?.name || 'EduManage'}. All rights reserved.</p>
              <p className="mt-2 text-xs opacity-50">Powered by EduManage SaaS</p>
            </div>
          </footer>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
