'use client';
import { useState } from 'react';
import { Sidebar } from './Sidebar';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export function AppLayout({ children, title }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 transform transition-transform duration-300 ease-in-out
          lg:relative lg:translate-x-0 lg:flex-shrink-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Menú lateral"
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm flex items-center gap-4 px-4 h-16 flex-shrink-0">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px]
                       flex items-center justify-center"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú de navegación"
            aria-expanded={sidebarOpen}
          >
            ☰
          </button>
          {title && (
            <h1 className="font-semibold text-gray-800 text-lg">{title}</h1>
          )}
        </header>

        {/* Contenido scrollable */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8"
          tabIndex={-1}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
