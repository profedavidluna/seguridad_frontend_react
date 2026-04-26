import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-6xl mb-4" aria-hidden="true">🛡️</div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Módulo 3
        </h1>
        <p className="text-gray-600 mb-8 text-lg">
          Datos Sensibles y Diseño Responsivo
        </p>

        <div className="bg-white rounded-xl shadow p-6 mb-6 text-left space-y-3">
          <h2 className="font-semibold text-gray-800">Usuarios de prueba:</h2>
          {[
            { email: 'ana.garcia@empresa.com', pass: 'Admin123!', role: 'Admin', color: 'purple' },
            { email: 'carlos.lopez@empresa.com', pass: 'Manager123!', role: 'Manager', color: 'blue' },
            { email: 'maria.torres@empresa.com', pass: 'Employee123!', role: 'Employee', color: 'green' },
          ].map((u) => (
            <div key={u.email} className="flex items-center gap-3 text-sm">
              <span className={`badge-${u.role.toLowerCase() as 'admin' | 'manager' | 'employee'}`}>
                {u.role}
              </span>
              <code className="text-gray-600 flex-1 truncate">{u.email}</code>
              <code className="text-gray-500">{u.pass}</code>
            </div>
          ))}
        </div>

        <Link href="/login" className="btn-primary inline-block w-full text-center">
          Ir al Login
        </Link>
      </div>
    </div>
  );
}
