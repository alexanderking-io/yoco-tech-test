export interface Register {
  id: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  closedAt: string | null;
  totalInCents: number;
}

export interface Charge {
  id: string;
  registerId: string;
  amountInCents: number;
  vatInCents: number;
  createdAt: string;
}

export interface ChargesListResponse {
  charges: Charge[];
  // Backend sends Kotlin Long (64-bit int). JS number safely represents integers
  // up to 2^53, which is sufficient given MAX_AMOUNT_CENTS = 99_999_999.
  totalInCents: number;
  totalVatInCents: number;
}

export interface ApiError {
  error: string;
  message: string;
}

/** Charge stored in local state, may include optimistic entries not yet confirmed */
export interface LocalCharge extends Charge {
  /** True while the server request is in-flight */
  isPending?: boolean;
}
