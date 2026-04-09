import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YTAPI // TERMINAL',
  description: 'YouTube Download API Management Terminal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-bg text-fg antialiased">
        {children}
      </body>
    </html>
  );
}
