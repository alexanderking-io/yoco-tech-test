import { ApiClient, ApiRequestError } from '../../src/api/client';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('ApiClient', () => {
  const BASE_URL = 'http://test-api';
  const client = new ApiClient(BASE_URL);

  function createResponse(status: number, body?: unknown): Response {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: jest.fn().mockResolvedValue(body),
      headers: new Headers(),
    } as unknown as Response;
  }

  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe('GET', () => {
    it('returns parsed JSON on success', async () => {
      const data = { id: '123', name: 'test' };
      mockFetch.mockResolvedValue(createResponse(200, data));

      const result = await client.get('/test');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({ method: 'GET' }),
      );
      expect(result).toEqual(data);
    });

    it('passes abort signal to fetch', async () => {
      mockFetch.mockResolvedValue(createResponse(200, {}));

      const controller = new AbortController();
      await client.get('/test', controller.signal);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('throws ApiRequestError on non-ok response with JSON body', async () => {
      const errorBody = { error: 'NOT_FOUND', message: 'Resource not found' };
      mockFetch.mockResolvedValue(createResponse(404, errorBody));

      await expect(client.get('/missing')).rejects.toThrow(ApiRequestError);
      await expect(client.get('/missing')).rejects.toMatchObject({
        status: 404,
        apiError: errorBody,
      });
    });

    it('throws ApiRequestError with fallback message on non-JSON error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: jest.fn().mockRejectedValue(new Error('not json')),
      });

      await expect(client.get('/broken')).rejects.toMatchObject({
        status: 500,
        apiError: { error: 'UNKNOWN_ERROR', message: 'Server returned 500' },
      });
    });
  });

  describe('POST', () => {
    it('sends JSON body and returns parsed response', async () => {
      const reqBody = { amountInCents: 1500 };
      const resBody = { id: 'charge-1', amountInCents: 1500 };
      mockFetch.mockResolvedValue(createResponse(201, resBody));

      const result = await client.post('/charges', reqBody);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/charges'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(reqBody),
        }),
      );
      expect(result).toEqual(resBody);
    });

    it('merges custom headers', async () => {
      mockFetch.mockResolvedValue(createResponse(201, {}));

      await client.post('/charges', {}, { 'Idempotency-Key': 'key-123' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({ 'Idempotency-Key': 'key-123' }),
        }),
      );
    });
  });

  describe('PATCH', () => {
    it('returns parsed JSON on success', async () => {
      const data = { id: '123', status: 'CLOSED' };
      mockFetch.mockResolvedValue(createResponse(200, data));

      const result = await client.patch('/registers/123/close');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/registers/123/close'),
        expect.objectContaining({ method: 'PATCH' }),
      );
      expect(result).toEqual(data);
    });
  });

  describe('DELETE', () => {
    it('resolves on 204 No Content', async () => {
      mockFetch.mockResolvedValue(createResponse(204));

      await expect(client.delete('/charges/123')).resolves.toBeUndefined();
    });

    it('throws on non-ok response', async () => {
      const errorBody = { error: 'NOT_FOUND', message: 'Charge not found' };
      mockFetch.mockResolvedValue(createResponse(404, errorBody));

      await expect(client.delete('/charges/999')).rejects.toThrow(ApiRequestError);
    });
  });

  describe('204 handling', () => {
    it('returns undefined for 204 on GET', async () => {
      mockFetch.mockResolvedValue(createResponse(204));

      const result = await client.get('/empty');

      expect(result).toBeUndefined();
    });
  });
});
