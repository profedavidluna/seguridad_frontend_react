'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { mockUsers } from '@/data/mockData';
import { maskEmail, maskPhone, maskSalary, maskSSN, formatSalary } from '@/lib/masks';

export default function AdminPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
      } else if (user?.role !== 'admin') {
        router.push('/acceso-denegado');
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl">⟳</div>
      </div>
    );
  }

  return (
    <AppLayout title="Administración">
      <div className="space-y-6">
        {/* Banner de advertencia */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3">
          <span className="text-xl flex-shrink-0" aria-hidden="true">⚠️</span>
          <div>
            <p className="font-semibold text-yellow-800 text-sm">Área Restringida</p>
            <p className="text-yellow-700 text-sm">
              Esta sección muestra datos confidenciales. Solo accesible por administradores.
              Todos los accesos quedan registrados.
            </p>
          </div>
        </div>

        {/* Tabla completa de empleados - visible solo para admin */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Gestión de Empleados</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Como administrador, puedes ver todos los datos. Los accesos se registran.
            </p>
          </div>

          {/* Tabla desktop */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Teléfono</th>
                  <th className="px-4 py-3 text-left">Salario</th>
                  <th className="px-4 py-3 text-left">SSN</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mockUsers.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{emp.name}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{emp.email}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono">{emp.phone}</td>
                    <td className="px-4 py-3 font-medium text-green-700">{formatSalary(emp.salary)}</td>
                    <td className="px-4 py-3 font-mono text-gray-500">{emp.ssn}</td>
                    <td className="px-4 py-3">
                      <span className={`badge-${emp.role}`}>{emp.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Tarjetas móvil/tablet */}
          <div className="lg:hidden divide-y divide-gray-100">
            {mockUsers.map((emp) => (
              <div key={emp.id} className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-gray-800">{emp.name}</p>
                  <span className={`badge-${emp.role}`}>{emp.role}</span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-gray-500">Email:</span>
                  <span className="font-mono text-gray-700 truncate">{emp.email}</span>
                  <span className="text-gray-500">Teléfono:</span>
                  <span className="font-mono text-gray-700">{emp.phone}</span>
                  <span className="text-gray-500">Salario:</span>
                  <span className="font-medium text-green-700">{formatSalary(emp.salary)}</span>
                  <span className="text-gray-500">SSN:</span>
                  <span className="font-mono text-gray-500">{emp.ssn}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Nota educativa */}
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
          <h3 className="font-semibold text-blue-800 mb-2 text-sm">📚 Nota Educativa</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Un usuario <strong>employee</strong> no puede acceder a esta página (redirige a /acceso-denegado)</li>
            <li>• Un usuario <strong>manager</strong> tampoco tiene acceso (solo admin)</li>
            <li>• En una app real, estos datos vendrían del servidor con verificación de permisos adicional</li>
            <li>• Los datos sensibles se mostrarían solo bajo solicitud explícita con audit log</li>
          </ul>
        </div>
      </div>
    </AppLayout>
  );
}
