'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { mockUsers } from '@/data/mockData';

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl" aria-label="Cargando...">⟳</div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Bienvenida */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
          <h2 className="text-2xl font-bold">Bienvenido, {user.name.split(' ')[0]} 👋</h2>
          <p className="text-blue-100 mt-1">
            Rol: <strong>{user.role}</strong> · Departamento: {user.department}
          </p>
        </div>

        {/* Stats Cards - Grid responsivo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Empleados', value: mockUsers.length, icon: '👥', color: 'blue' },
            { label: 'Departamentos', value: 4, icon: '🏢', color: 'green' },
            { label: 'Documentos', value: 127, icon: '📄', color: 'yellow' },
            { label: 'Seguridad', value: '100%', icon: '🔒', color: 'purple' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">{stat.icon}</span>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Lista de empleados (datos con enmascaramiento) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Equipo</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Los datos sensibles están enmascarados según tu rol
            </p>
          </div>

          {/* Tabla (desktop) / Tarjetas (móvil) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Departamento</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mockUsers.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{emp.name}</td>
                    <td className="px-4 py-3 text-gray-600">{emp.department}</td>
                    <td className="px-4 py-3">
                      <span className={`badge-${emp.role}`}>{emp.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={`/perfil?id=${emp.id}`} className="text-blue-600 text-xs hover:underline">
                        Ver perfil
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas móvil */}
          <div className="md:hidden divide-y divide-gray-100">
            {mockUsers.map((emp) => (
              <div key={emp.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{emp.name}</p>
                    <p className="text-sm text-gray-500">{emp.department}</p>
                  </div>
                  <span className={`badge-${emp.role}`}>{emp.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
