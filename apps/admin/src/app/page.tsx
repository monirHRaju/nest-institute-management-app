import { redirect } from 'next/navigation';

export default function HomePage() {
  // Root "/" redirects to /dashboard; middleware handles auth check.
  redirect('/dashboard');
}
