import { deleteSecret, readSecret, writeSecret } from '@/utils/sessionStorage';

const TOKEN_KEY = '@hangy:token';
const REFRESH_TOKEN_KEY = '@hangy:refresh-token';

/** Par devolvido por login, cadastro e `POST /auth/refresh`. */
export interface Session {
  accessToken: string;
  refreshToken: string | null;
}

export async function saveSession({ accessToken, refreshToken }: Session): Promise<void> {
  await writeSecret(TOKEN_KEY, accessToken);
  if (refreshToken) await writeSecret(REFRESH_TOKEN_KEY, refreshToken);
  else await deleteSecret(REFRESH_TOKEN_KEY);
}

/** Só o access token (sem renovação). Prefira `saveSession`. */
export function saveToken(token: string): Promise<void> {
  return writeSecret(TOKEN_KEY, token);
}

export function getToken(): Promise<string | null> {
  return readSecret(TOKEN_KEY);
}

export function getRefreshToken(): Promise<string | null> {
  return readSecret(REFRESH_TOKEN_KEY);
}

/** Apaga a sessão inteira deste aparelho: access e refresh token. */
export async function removeToken(): Promise<void> {
  await deleteSecret(TOKEN_KEY);
  await deleteSecret(REFRESH_TOKEN_KEY);
}
