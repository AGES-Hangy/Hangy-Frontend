/** As 4 seções da área administrativa, nos nomes do eixo Active do Figma. */
export type AdminNavDestination = 'Painel' | 'Denuncias' | 'Usuarios' | 'Conteudo';

export interface AdminNavProps {
  /** Seção destacada. */
  active: AdminNavDestination;
  /**
   * Toque numa seção. Quem usa o componente decide a rota; `Conteudo` ainda
   * não tem tela nesta rodada do épico E11.
   */
  onNavigate: (dest: AdminNavDestination) => void;
}
