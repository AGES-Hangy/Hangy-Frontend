import { Redirect, useLocalSearchParams } from 'expo-router';

/**
 * Destino do link de convite. O backend monta `web_url` como
 * `{FRONTEND_BASE_URL}/invite/{token}` e o deep link como
 * `hangy://invite/{token}` (`GET /events/{id}/share`), então o caminho
 * precisa ser exatamente este — por isso a pasta é minúscula, fora da
 * convenção PascalCase das telas.
 *
 * Não renderiza nada: entrega o token ao `EventDetail`, que já resolve o
 * convite (aceita, abre o evento e cuida de sessão ausente e token expirado).
 */
export default function InviteLink() {
  const { token } = useLocalSearchParams<{ token: string }>();

  return <Redirect href={{ pathname: '/EventDetail', params: { token } }} />;
}
