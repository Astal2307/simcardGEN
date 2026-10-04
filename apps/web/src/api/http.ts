import type { ErrorCode, ErrorResponse } from '@simrush/shared';

export class ApiError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** Адрес бэкенда. Пусто — тот же источник (dev-прокси Vite или сервер раздаёт фронт сам). */
export const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

let token: string | null = null;

export const setToken = (t: string | null) => { token = t; };
export const getToken = () => token;

export async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res: Response;
  try {
    res = await fetch(API_BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError('INTERNAL', 'Нет связи с сервером', 0);
  }
  if (res.status === 204) return undefined as T;

  const data = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const err = data as Partial<ErrorResponse> | null;
    throw new ApiError(err?.error ?? 'INTERNAL', err?.message ?? 'Ошибка сервера', res.status);
  }
  return data as T;
}
