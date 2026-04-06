import { API_BASE_URL } from "../constants/config";
import { ApiError } from "../types";

// In a real production app I would possibly implement request timeouts, retry with exponential backoff,
// circuit breaking, and offline-first queuing.

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async get<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>("GET", path, undefined, undefined, signal);
  }

  async post<T>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<T> {
    return this.request<T>("POST", path, body, headers, signal);
  }

  async patch<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.request<T>("PATCH", path, undefined, undefined, signal);
  }

  async delete(path: string, signal?: AbortSignal): Promise<void> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      signal,
    });

    if (!response.ok) {
      await this.handleError(response);
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });

    if (!response.ok) {
      await this.handleError(response);
    }

    return response.json() as Promise<T>;
  }

  private async handleError(response: Response): Promise<never> {
    let apiError: ApiError;
    try {
      apiError = (await response.json()) as ApiError;
    } catch {
      apiError = {
        error: "UNKNOWN_ERROR",
        message: `Server returned ${response.status}`,
      };
    }
    throw new ApiRequestError(response.status, apiError);
  }
}

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly apiError: ApiError,
  ) {
    super(apiError.message);
    this.name = "ApiRequestError";
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
