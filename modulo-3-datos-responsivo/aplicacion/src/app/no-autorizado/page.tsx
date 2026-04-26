import Link from 'next/link';

export default function NoAutorizadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center max-w-md w-full">
        <div className="text-6xl mb-4" aria-hidden="true">🔒</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sesión Requerida</h1>
        <p className="text-gray-500 mb-6">
          Tu sesión ha expirado o no has iniciado sesión.
          Por favor inicia sesión para continuar.
        </p>
        <Link href="/login" className="btn-primary inline-block">
          Iniciar Sesión
        </Link>
        {/* Info educativa - solo en demo */}
        <div className="mt-8 p-4 bg-blue-50 rounded-xl text-left border border-blue-100">
          <p className="text-xs font-semibold text-blue-800 mb-1">📚 Nota del curso (HTTP 401):</p>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• 401 = No autenticado (sin token o token expirado)</li>
            <li>• Redirigir al login con `returnUrl` para volver al destino</li>
            <li>• Intentar refresh token antes de mostrar esta página</li>
            <li>• Mensaje genérico (no revelar detalles del token)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
