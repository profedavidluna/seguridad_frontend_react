'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';

const navLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/perfil', label: 'Mi Perfil', icon: '👤' },
  { href: '/admin', label: 'Administración', icon: '⚙️', adminOnly: true },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push('/login');
    onClose?.();
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white">
      {/* Header del sidebar */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div>
          <p className="font-bold text-lg">🛡️ EmpresaApp</p>
          <p className="text-xs text-gray-400">Panel Empresarial Seguro</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded hover:bg-gray-700"
            aria-label="Cerrar menú"
          >✕</button>
        )}
      </div>

      {/* Info de usuario */}
      {user && (
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
              {user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{user.name}</p>
              <span className={`badge-${user.role} text-xs`}>{user.role}</span>
            </div>
          </div>
        </div>
      )}

      {/* Navegación */}
      <nav className="flex-1 p-4 space-y-1" aria-label="Navegación principal">
        {navLinks
          .filter((link) => !link.adminOnly || user?.role === 'admin')
          .map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === link.href
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
              }`}
              aria-current={pathname === link.href ? 'page' : undefined}
            >
              <span aria-hidden="true">{link.icon}</span>
              {link.label}
            </Link>
          ))}
      </nav>

      {/* Botón de logout */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300
                     hover:bg-red-700 hover:text-white transition-colors w-full text-left"
        >
          <span aria-hidden="true">🚪</span>
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
