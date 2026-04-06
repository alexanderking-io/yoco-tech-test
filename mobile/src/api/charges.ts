import { apiClient } from './client';
import { Charge, ChargesListResponse } from '../types';

export async function addCharge(
  registerId: string,
  amountInCents: number,
  idempotencyKey: string,
): Promise<Charge> {
  return apiClient.post<Charge>(
    `/registers/${registerId}/charges`,
    { amountInCents },
    { 'Idempotency-Key': idempotencyKey },
  );
}

export async function getCharges(registerId: string, signal?: AbortSignal): Promise<ChargesListResponse> {
  return apiClient.get<ChargesListResponse>(`/registers/${registerId}/charges`, signal);
}

export async function deleteCharge(registerId: string, chargeId: string): Promise<void> {
  return apiClient.delete(`/registers/${registerId}/charges/${chargeId}`);
}
