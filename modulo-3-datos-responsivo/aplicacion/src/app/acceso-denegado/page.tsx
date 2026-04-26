import Link from 'next/link';

export default function AccesoDenegadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md w-full">
        <div className="text-6xl mb-4" aria-hidden="true">🚫</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
        {/* Mensaje genérico - NO revelar qué recurso ni por qué exactamente */}
        <p className="text-gray-500 mb-6">
          No tienes permiso para acceder a este recurso.
          Si crees que esto es un error, contacta a tu administrador.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="btn-secondary">
            ← Volver al Dashboard
          </Link>
          <a href="mailto:soporte@empresa.com" className="btn-primary">
            Contactar Soporte
          </a>
        </div>
        {/* Info educativa - solo en demo */}
        <div className="mt-8 p-4 bg-yellow-50 rounded-xl text-left border border-yellow-100">
          <p className="text-xs font-semibold text-yellow-800 mb-1">📚 Nota del curso (HTTP 403):</p>
          <ul className="text-xs text-yellow-700 space-y-1">
            <li>• 403 = Autenticado, pero SIN permiso</li>
            <li>• NO redirigir al login (ya tiene sesión)</li>
            <li>• NO revelar el recurso denegado</li>
            <li>• Ofrecer navegación alternativa</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
