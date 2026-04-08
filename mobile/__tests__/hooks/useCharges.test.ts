import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useCharges } from '../../src/hooks/useCharges';
import * as chargesApi from '../../src/api/charges';
import * as uuid from '../../src/utils/uuid';

jest.mock('../../src/api/charges');
jest.mock('../../src/utils/uuid');

const mockGetCharges = chargesApi.getCharges as jest.MockedFunction<typeof chargesApi.getCharges>;
const mockAddCharge = chargesApi.addCharge as jest.MockedFunction<typeof chargesApi.addCharge>;
const mockDeleteCharge = chargesApi.deleteCharge as jest.MockedFunction<typeof chargesApi.deleteCharge>;
const mockGenerateKey = uuid.generateIdempotencyKey as jest.MockedFunction<typeof uuid.generateIdempotencyKey>;

const REGISTER_ID = 'register-1';

const makeCharge = (overrides = {}) => ({
  id: 'charge-1',
  registerId: REGISTER_ID,
  amountInCents: 1500,
  vatInCents: 225,
  createdAt: '2026-04-07T10:00:00Z',
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockGenerateKey.mockReturnValue('idempotency-key-1');
});

describe('useCharges', () => {
  describe('initial load', () => {
    it('fetches charges on mount and sets state', async () => {
      const charge = makeCharge();
      mockGetCharges.mockResolvedValue({
        charges: [charge],
        totalInCents: 1500,
        totalVatInCents: 225,
      });

      const { result } = renderHook(() => useCharges(REGISTER_ID));

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.charges).toEqual([charge]);
      expect(result.current.error).toBeNull();
      expect(mockGetCharges).toHaveBeenCalledWith(REGISTER_ID, expect.any(AbortSignal));
    });

    it('sets empty state when registerId is null', () => {
      const { result } = renderHook(() => useCharges(null));

      expect(result.current.charges).toEqual([]);
      expect(result.current.isLoading).toBe(false);
      expect(mockGetCharges).not.toHaveBeenCalled();
    });

    it('sets error on fetch failure', async () => {
      mockGetCharges.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useCharges(REGISTER_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
      expect(result.current.charges).toEqual([]);
    });
  });

  describe('totals', () => {
    it('computes totalInCents and totalVatInCents from charges', async () => {
      mockGetCharges.mockResolvedValue({
        charges: [
          makeCharge({ id: 'c1', amountInCents: 1000, vatInCents: 150 }),
          makeCharge({ id: 'c2', amountInCents: 2000, vatInCents: 300 }),
        ],
        totalInCents: 3000,
        totalVatInCents: 450,
      });

      const { result } = renderHook(() => useCharges(REGISTER_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalInCents).toBe(3000);
      expect(result.current.totalVatInCents).toBe(450);
    });
  });

  describe('addCharge', () => {
    it('optimistically adds then confirms with server response', async () => {
      mockGetCharges.mockResolvedValue({ charges: [], totalInCents: 0, totalVatInCents: 0 });
      const serverCharge = makeCharge({ id: 'server-id', vatInCents: 225 });
      mockAddCharge.mockResolvedValue(serverCharge);

      const { result } = renderHook(() => useCharges(REGISTER_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addCharge(1500);
      });

      // Optimistic charge replaced by server charge
      expect(result.current.charges).toEqual([
        expect.objectContaining({ id: 'server-id', vatInCents: 225, isPending: false }),
      ]);
      expect(result.current.error).toBeNull();
    });

    it('shows optimistic charge as pending during request', async () => {
      mockGetCharges.mockResolvedValue({ charges: [], totalInCents: 0, totalVatInCents: 0 });

      let resolveAdd: (value: ReturnType<typeof makeCharge>) => void;
      mockAddCharge.mockImplementation(() => new Promise((resolve) => { resolveAdd = resolve; }));

      const { result } = renderHook(() => useCharges(REGISTER_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start adding without awaiting
      let addPromise: Promise<boolean>;
      act(() => {
        addPromise = result.current.addCharge(1500);
      });

      // Optimistic charge should be pending
      expect(result.current.charges).toHaveLength(1);
      expect(result.current.charges[0].isPending).toBe(true);
      expect(result.current.charges[0].vatInCents).toBe(0);

      // Resolve the server call
      await act(async () => {
        resolveAdd!(makeCharge({ id: 'server-id' }));
        await addPromise!;
      });

      expect(result.current.charges[0].isPending).toBe(false);
    });

    it('rolls back optimistic charge on failure', async () => {
      mockGetCharges.mockResolvedValue({ charges: [], totalInCents: 0, totalVatInCents: 0 });
      mockAddCharge.mockRejectedValue(new Error('Server error'));

      const { result } = renderHook(() => useCharges(REGISTER_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addCharge(1500);
      });

      expect(result.current.charges).toEqual([]);
      expect(result.current.error).toBe('Server error');
    });

    it('reuses idempotency key on retry after failure', async () => {
      mockGetCharges.mockResolvedValue({ charges: [], totalInCents: 0, totalVatInCents: 0 });
      mockAddCharge.mockRejectedValueOnce(new Error('Network error'));
      mockAddCharge.mockResolvedValueOnce(makeCharge({ id: 'server-id' }));

      const { result } = renderHook(() => useCharges(REGISTER_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First attempt fails
      await act(async () => {
        await result.current.addCharge(1500);
      });

      expect(mockAddCharge).toHaveBeenCalledWith(REGISTER_ID, 1500, 'idempotency-key-1');

      // Retry — should reuse same key
      await act(async () => {
        await result.current.addCharge(1500);
      });

      expect(mockAddCharge).toHaveBeenCalledTimes(2);
      expect(mockAddCharge).toHaveBeenLastCalledWith(REGISTER_ID, 1500, 'idempotency-key-1');
    });

    it('generates fresh idempotency key after success', async () => {
      mockGetCharges.mockResolvedValue({ charges: [], totalInCents: 0, totalVatInCents: 0 });
      mockAddCharge.mockResolvedValue(makeCharge({ id: 'server-1' }));
      mockGenerateKey.mockReturnValueOnce('key-1').mockReturnValueOnce('key-2');

      const { result } = renderHook(() => useCharges(REGISTER_ID));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.addCharge(1000);
      });

      expect(mockAddCharge).toHaveBeenCalledWith(REGISTER_ID, 1000, 'key-1');

      mockAddCharge.mockResolvedValue(makeCharge({ id: 'server-2' }));

      await act(async () => {
        await result.current.addCharge(2000);
      });

      expect(mockAddCharge).toHaveBeenLastCalledWith(REGISTER_ID, 2000, 'key-2');
    });
  });

  describe('deleteCharge', () => {
    it('optimistically removes charge', async () => {
      const charge = makeCharge();
      mockGetCharges.mockResolvedValue({ charges: [charge], totalInCents: 1500, totalVatInCents: 225 });
      mockDeleteCharge.mockResolvedValue(undefined);

      const { result } = renderHook(() => useCharges(REGISTER_ID));

      await waitFor(() => {
        expect(result.current.charges).toHaveLength(1);
      });

      await act(async () => {
        await result.current.deleteCharge('charge-1');
      });

      expect(result.current.charges).toEqual([]);
      expect(mockDeleteCharge).toHaveBeenCalledWith(REGISTER_ID, 'charge-1');
    });

    it('rolls back on delete failure', async () => {
      const charge = makeCharge();
      mockGetCharges.mockResolvedValue({ charges: [charge], totalInCents: 1500, totalVatInCents: 225 });
      mockDeleteCharge.mockRejectedValue(new Error('Delete failed'));

      const { result } = renderHook(() => useCharges(REGISTER_ID));

      await waitFor(() => {
        expect(result.current.charges).toHaveLength(1);
      });

      await act(async () => {
        await result.current.deleteCharge('charge-1');
      });

      expect(result.current.charges).toEqual([charge]);
      expect(result.current.error).toBe('Delete failed');
    });

    it('no-ops when charge does not exist', async () => {
      mockGetCharges.mockResolvedValue({ charges: [makeCharge()], totalInCents: 1500, totalVatInCents: 225 });

      const { result } = renderHook(() => useCharges(REGISTER_ID));

      await waitFor(() => {
        expect(result.current.charges).toHaveLength(1);
      });

      await act(async () => {
        await result.current.deleteCharge('nonexistent');
      });

      expect(result.current.charges).toHaveLength(1);
      expect(mockDeleteCharge).not.toHaveBeenCalled();
    });
  });

  describe('dismissError', () => {
    it('clears the error state', async () => {
      mockGetCharges.mockRejectedValue(new Error('Load failed'));

      const { result } = renderHook(() => useCharges(REGISTER_ID));

      await waitFor(() => {
        expect(result.current.error).toBe('Load failed');
      });

      act(() => {
        result.current.dismissError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});
