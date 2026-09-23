import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const headerStore = await headers();

  // Locale from cookie, fallback to Accept-Language header, then 'en'
  const locale =
    cookieStore.get('locale')?.value ??
    (headerStore.get('accept-language')?.startsWith('bn') ? 'bn' : 'en');

  const resolvedLocale = ['en', 'bn'].includes(locale) ? locale : 'en';

  return {
    locale: resolvedLocale,
    messages: (await import(`../messages/${resolvedLocale}.json`)).default,
  };
});
