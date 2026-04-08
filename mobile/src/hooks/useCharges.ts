import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { LocalCharge } from "../types";
import * as chargesApi from "../api/charges";
import { ApiRequestError } from "../api/client";
import { generateIdempotencyKey } from "../utils/uuid";
import { isAbortError } from "../utils/abort";

function isRegisterClosedError(err: unknown): boolean {
  return (
    err instanceof ApiRequestError && err.apiError.error === "REGISTER_CLOSED"
  );
}

interface UseChargesResult {
  charges: LocalCharge[];
  totalInCents: number;
  totalVatInCents: number;
  isLoading: boolean;
  error: string | null;
  addCharge: (amountInCents: number) => Promise<boolean>;
  deleteCharge: (chargeId: string) => Promise<void>;
  dismissError: () => void;
}

interface UseChargesOptions {
  onRegisterClosed?: () => void;
}

export function useCharges(
  registerId: string | null,
  options?: UseChargesOptions,
): UseChargesResult {
  const [charges, setCharges] = useState<LocalCharge[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server-provided totals — source of truth for confirmed charges
  const [serverTotalInCents, setServerTotalInCents] = useState(0);
  const [serverTotalVatInCents, setServerTotalVatInCents] = useState(0);

  // Ref to avoid stale closure over options in callbacks
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Fetch charges when register changes
  useEffect(() => {
    if (!registerId) {
      setCharges([]);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();

    const fetchCharges = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await chargesApi.getCharges(
          registerId,
          controller.signal,
        );
        setCharges(response.charges);
        setServerTotalInCents(response.totalInCents ?? 0);
        setServerTotalVatInCents(response.totalVatInCents ?? 0);
      } catch (err) {
        if (isAbortError(err)) return;
        const message =
          err instanceof Error
            ? err.message
            : `Failed to load charges for register ${registerId}`;
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    fetchCharges();
    return () => controller.abort();
  }, [registerId]);

  // Displayed totals: server totals + pending (optimistic) charge amounts.
  // Pending charges have vatInCents: 0, so only their amount is added.
  const totalInCents = useMemo(() => {
    const pendingDelta = charges
      .filter((c) => c.isPending)
      .reduce((sum, c) => sum + c.amountInCents, 0);
    return serverTotalInCents + pendingDelta;
  }, [charges, serverTotalInCents]);

  const totalVatInCents = serverTotalVatInCents;

  const addCharge = useCallback(
    async (amountInCents: number): Promise<boolean> => {
      if (!registerId) return false;

      setError(null);

      const idempotencyKey = generateIdempotencyKey();

      // Optimistic insert — VAT will be set when the server responds
      const optimisticCharge: LocalCharge = {
        id: idempotencyKey, // Temporary ID — replaced by server response
        registerId,
        amountInCents,
        vatInCents: 0,
        createdAt: new Date().toISOString(),
        isPending: true,
      };

      setCharges((prev) => [...prev, optimisticCharge]);

      try {
        const charge = await chargesApi.addCharge(
          registerId,
          amountInCents,
          idempotencyKey,
        );

        console.log('addCharge response:', JSON.stringify(charge));

        // Replace optimistic charge with server-confirmed charge
        setCharges((prev) =>
          prev.map((c) =>
            c.id === idempotencyKey ? { ...charge, isPending: false } : c,
          ),
        );

        // Update server totals with the confirmed charge
        setServerTotalInCents((prev) => prev + charge.amountInCents);
        setServerTotalVatInCents((prev) => prev + charge.vatInCents);

        return true;
      } catch (err) {
        // Rollback optimistic insert
        setCharges((prev) => prev.filter((c) => c.id !== idempotencyKey));
        const message =
          err instanceof Error
            ? err.message
            : `Failed to add charge to register ${registerId}`;
        setError(message);
        if (isRegisterClosedError(err)) {
          optionsRef.current?.onRegisterClosed?.();
        }
        return false;
      }
    },
    [registerId],
  );

  const deleteCharge = useCallback(
    async (chargeId: string) => {
      if (!registerId) return;

      setError(null);

      const deletedCharge = charges.find((c) => c.id === chargeId);
      if (!deletedCharge) return;

      // Optimistic removal + total update
      setCharges((prev) => prev.filter((c) => c.id !== chargeId));
      setServerTotalInCents((prev) => prev - deletedCharge.amountInCents);
      setServerTotalVatInCents(
        (prev) => prev - (deletedCharge.vatInCents ?? 0),
      );

      try {
        await chargesApi.deleteCharge(registerId, chargeId);
      } catch (err) {
        // Rollback — append rather than restore snapshot to preserve concurrent mutations
        setCharges((prev) => [...prev, deletedCharge]);
        setServerTotalInCents((prev) => prev + deletedCharge.amountInCents);
        setServerTotalVatInCents(
          (prev) => prev + (deletedCharge.vatInCents ?? 0),
        );
        const message =
          err instanceof Error
            ? err.message
            : `Failed to delete charge ${chargeId}`;
        setError(message);
        if (isRegisterClosedError(err))
          optionsRef.current?.onRegisterClosed?.();
      }
    },
    [registerId, charges],
  );

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  return {
    charges,
    totalInCents,
    totalVatInCents,
    isLoading,
    error,
    addCharge,
    deleteCharge,
    dismissError,
  };
}
