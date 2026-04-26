'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserProfileCard } from '@/components/UserProfileCard';
import { mockUsers } from '@/data/mockData';
import { useToast } from '@/lib/ToastContext';

export default function PerfilPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl">⟳</div>
      </div>
    );
  }

  if (!user) return null;

  // Obtener el empleado completo desde los datos mock
  const employee = mockUsers.find((u) => u.id === user.id) ?? user;

  return (
    <AppLayout title="Mi Perfil">
      <div className="max-w-2xl mx-auto space-y-6">
        <UserProfileCard employee={employee} />

        {/* Sección educativa: demostración de las técnicas */}
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-6">
          <h3 className="font-semibold text-blue-800 mb-3">
            📚 ¿Qué demuestra esta página?
          </h3>
          <ul className="space-y-2 text-sm text-blue-700">
            <li>🔒 <strong>Enmascaramiento de datos:</strong> Email, teléfono, SSN y salario se muestran parcialmente</li>
            <li>👥 <strong>Control por rol:</strong> Solo admin puede ver todos los datos sin restricción</li>
            <li>👁️ <strong>Reveal bajo demanda:</strong> El usuario puede revelar sus propios datos</li>
            <li>📝 <strong>Audit trail:</strong> Todos los accesos quedan registrados (mock)</li>
          </ul>
        </div>

        {/* Demo de toasts */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-800 mb-3">Demo de Notificaciones</h3>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => toast.success('Perfil actualizado correctamente')} className="btn-primary text-sm py-1.5">
              ✓ Éxito
            </button>
            <button onClick={() => toast.error('No se pudo guardar los cambios')} className="btn-danger text-sm py-1.5">
              ✕ Error
            </button>
            <button onClick={() => toast.info('Sesión expira en 5 minutos')} className="btn-secondary text-sm py-1.5">
              ℹ Info
            </button>
            <button onClick={() => toast.warning('Datos no guardados')} className="btn-secondary text-sm py-1.5 border-yellow-300 text-yellow-700">
              ⚠ Aviso
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
