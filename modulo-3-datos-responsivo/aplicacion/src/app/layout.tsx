import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import { ToastProvider } from '@/lib/ToastContext';

export const metadata: Metadata = {
  title: 'Módulo 3 – Datos Sensibles y Diseño Responsivo',
  description: 'Aplicación práctica del Módulo 3 del curso de Frontend Empresarial Seguro',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-gray-50 text-gray-900">
        <AuthProvider>
          <ToastProvider>
            {/* Skip link para accesibilidad */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4
                         focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white
                         focus:rounded-lg focus:shadow-lg"
            >
              Ir al contenido principal
            </a>
            {children}
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
