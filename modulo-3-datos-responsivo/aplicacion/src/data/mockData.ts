// Datos mock para demostración
import type { User } from '@/types';

export const mockUsers: User[] = [
  {
    id: '1',
    name: 'Ana García',
    email: 'ana.garcia@empresa.com',
    role: 'admin',
    department: 'Tecnología',
    phone: '3001234567',
    salary: 8500000,
    ssn: '123-45-6789',
  },
  {
    id: '2',
    name: 'Carlos López',
    email: 'carlos.lopez@empresa.com',
    role: 'manager',
    department: 'Ventas',
    phone: '3009876543',
    salary: 5200000,
    ssn: '987-65-4321',
  },
  {
    id: '3',
    name: 'María Torres',
    email: 'maria.torres@empresa.com',
    role: 'employee',
    department: 'Recursos Humanos',
    phone: '3005551234',
    salary: 3800000,
    ssn: '555-12-3456',
  },
];

// Credenciales demo (en producción esto está en el servidor)
export const mockCredentials = [
  { email: 'ana.garcia@empresa.com', password: 'Admin123!', userId: '1' },
  { email: 'carlos.lopez@empresa.com', password: 'Manager123!', userId: '2' },
  { email: 'maria.torres@empresa.com', password: 'Employee123!', userId: '3' },
];
