import type { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Algorithm Mebel</h1>
            <p className="text-sm text-gray-500">Планировщик кухонных модулей</p>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6">{children}</main>
    </div>
  );
}
