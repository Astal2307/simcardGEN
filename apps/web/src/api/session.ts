import type { UserDTO } from '@simrush/shared';
import { api } from './endpoints';
import { ApiError, setToken } from './http';

const KEY = 'simrush.token';

const load = (): string | null => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
const save = (t: string) => {
  try { localStorage.setItem(KEY, t); } catch { /* приватный режим — живём без сохранения */ }
};

/** Восстанавливает гостевую сессию из localStorage или создаёт новую. */
export async function restoreSession(): Promise<UserDTO> {
  const saved = load();
  if (saved) {
    setToken(saved);
    try {
      return await api.me();
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) throw err;
    }
  }
  const session = await api.createSession();
  setToken(session.token);
  save(session.token);
  return session.user;
}
