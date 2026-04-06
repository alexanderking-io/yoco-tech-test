import { apiClient } from './client';
import { Register } from '../types';

export async function createRegister(): Promise<Register> {
  return apiClient.post<Register>('/registers');
}

export async function getRegister(registerId: string, signal?: AbortSignal): Promise<Register> {
  return apiClient.get<Register>(`/registers/${registerId}`, signal);
}

export async function listRegisters(status?: 'OPEN' | 'CLOSED', signal?: AbortSignal): Promise<Register[]> {
  const query = status ? `?status=${status}` : '';
  return apiClient.get<Register[]>(`/registers${query}`, signal);
}

export async function closeRegister(registerId: string): Promise<Register> {
  return apiClient.patch<Register>(`/registers/${registerId}/close`);
}

export async function deleteRegister(registerId: string): Promise<void> {
  return apiClient.delete(`/registers/${registerId}`);
}
