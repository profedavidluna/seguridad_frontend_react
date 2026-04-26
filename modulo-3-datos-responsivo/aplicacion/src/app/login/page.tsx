'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch {
      // Mensaje genérico - no revelar si el email existe
      setError('Credenciales incorrectas. Verifica tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3" aria-hidden="true">🔐</div>
          <h1 className="text-2xl font-bold text-gray-900">Iniciar Sesión</h1>
          <p className="text-gray-500 mt-1">Panel Empresarial Seguro</p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          {/* Error de autenticación - mensaje genérico */}
          {error && (
            <div
              role="alert"
              className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {/* Campo email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="input-field"
                placeholder="usuario@empresa.com"
                disabled={loading}
              />
            </div>

            {/* Campo contraseña con toggle */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="input-field pr-10"
                  placeholder="••••••••"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Botón submit */}
            <button
              type="submit"
              disabled={loading || !email || !password}
              aria-busy={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading && <span className="animate-spin" aria-hidden="true">⟳</span>}
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>

        {/* Info de seguridad */}
        <p className="text-center text-xs text-gray-400 mt-4">
          🔒 Conexión segura. Tus datos están protegidos.
        </p>
      </div>
    </div>
  );
}
