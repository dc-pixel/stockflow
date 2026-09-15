import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'StockFlow — Inventory Intelligence',
  description: 'Real-time inventory visibility, forecasting and reorder intelligence.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
