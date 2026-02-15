import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Панель управления',
  description: 'Административная панель управления',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body className="font-sans">{children}</body>
    </html>
  );
}
