// Utilidades para enmascarar datos sensibles
// Estas funciones demuestran las técnicas del Módulo 3

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(local.length - 2, 3))}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length < 7) return '***';
  return `${phone.slice(0, 3)}${'*'.repeat(phone.length - 7)}${phone.slice(-4)}`;
}

export function maskSSN(ssn: string): string {
  // Mostrar solo los últimos 4 dígitos
  return `***-**-${ssn.replace(/\D/g, '').slice(-4)}`;
}

export function maskSalary(salary: number): string {
  // El empleado solo ve rango, no monto exacto
  const formatted = salary.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
  return formatted.replace(/\d/g, '*');
}

export function formatSalary(salary: number): string {
  return salary.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });
}

// Sanitizar texto para prevenir XSS
export function sanitizeText(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
