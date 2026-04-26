'use client';
import { useState } from 'react';
import type { User, UserRole } from '@/types';
import {
  maskEmail,
  maskPhone,
  maskSSN,
  maskSalary,
  formatSalary,
} from '@/lib/masks';
import { useAuth } from '@/lib/AuthContext';

interface SensitiveRowProps {
  label: string;
  value: string;
  maskedValue: string;
  canReveal: boolean;
}

function SensitiveRow({ label, value, maskedValue, canReveal }: SensitiveRowProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500 w-32 flex-shrink-0">{label}</span>
      <span className="font-mono text-sm text-gray-800 flex-1">
        {revealed ? value : maskedValue}
      </span>
      {canReveal && (
        <button
          onClick={() => setRevealed((r) => !r)}
          className="text-xs text-blue-600 hover:underline ml-3 min-w-[50px]"
          aria-label={`${revealed ? 'Ocultar' : 'Ver'} ${label}`}
        >
          {revealed ? 'Ocultar' : 'Ver'}
        </button>
      )}
      {!canReveal && (
        <span className="text-xs text-gray-400 ml-3">🔒</span>
      )}
    </div>
  );
}

interface UserProfileCardProps {
  employee: User;
}

const canRevealField = (viewerRole: UserRole, fieldRole: UserRole): boolean => {
  const roleLevel: Record<UserRole, number> = { admin: 3, manager: 2, employee: 1 };
  return roleLevel[viewerRole] >= roleLevel[fieldRole];
};

export function UserProfileCard({ employee }: UserProfileCardProps) {
  const { user: viewer } = useAuth();
  if (!viewer) return null;

  const isOwnProfile = viewer.id === employee.id;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600
                          flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
            {employee.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{employee.name}</h2>
            <p className="text-gray-500 text-sm">{employee.department}</p>
            <span className={`badge-${employee.role} mt-1 inline-block`}>{employee.role}</span>
          </div>
        </div>
      </div>

      {/* Datos con protección por rol */}
      <div className="p-6">
        <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
          Información de Contacto
        </h3>

        <SensitiveRow
          label="Email"
          value={employee.email}
          maskedValue={maskEmail(employee.email)}
          canReveal={isOwnProfile || canRevealField(viewer.role, 'manager')}
        />

        <SensitiveRow
          label="Teléfono"
          value={employee.phone}
          maskedValue={maskPhone(employee.phone)}
          canReveal={isOwnProfile || canRevealField(viewer.role, 'manager')}
        />

        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">
            Información Confidencial
          </h3>

          <SensitiveRow
            label="Salario"
            value={formatSalary(employee.salary)}
            maskedValue={maskSalary(employee.salary)}
            canReveal={isOwnProfile || canRevealField(viewer.role, 'admin')}
          />

          <SensitiveRow
            label="SSN / ID"
            value={employee.ssn}
            maskedValue={maskSSN(employee.ssn)}
            canReveal={viewer.role === 'admin'}
          />
        </div>
      </div>

      {/* Footer informativo */}
      <div className="px-6 py-3 bg-gray-50 rounded-b-xl border-t border-gray-100">
        <p className="text-xs text-gray-400">
          🔒 Los datos marcados con 🔒 solo son visibles para roles autorizados.
          Todos los accesos quedan registrados.
        </p>
      </div>
    </div>
  );
}
