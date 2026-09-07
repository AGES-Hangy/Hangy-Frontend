export type DialogVariant = 'LeaveEvent' | 'DeleteEvent' | 'SendRequest';

export type DialogProps = {
  visible: boolean;
  variant: DialogVariant;

  onConfirm: () => void;

  onCancel: () => void;

  /**
   * Sobrescreve o título da variante. Existe para o texto que depende de dado
   * — "Remover Ana Souza do evento?", "Os 10 confirmados recebem uma
   * notificação" — que não cabe numa constante fixa. A variante continua
   * mandando na aparência (destrutiva ou não); só a cópia muda.
   */
  title?: string;
  /** Sobrescreve a descrição da variante. Ver `title`. */
  description?: string;
  /** Sobrescreve o rótulo do botão de confirmar. Ver `title`. */
  confirmLabel?: string;

  /**
   * Ação em voo: o botão de confirmar vira spinner e os dois botões param de
   * responder, para o usuário não disparar a mesma ação destrutiva duas vezes.
   */
  isLoading?: boolean;
};
