/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Tenant theming via CSS variables injected at runtime
      colors: {
        'tenant-primary': 'var(--tenant-primary, #2563eb)',
        'tenant-accent': 'var(--tenant-accent, #f59e0b)',
      },
    },
  },
  plugins: [],
};
