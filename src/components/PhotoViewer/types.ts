export type PhotoViewerItem = {
  /** Id da foto no servidor; também é a chave da lista. */
  id: string;
  uri: string;
  /** Título exibido no rodapé — o nome do evento da foto. */
  title?: string | null;
  /** Texto da experiência a que a foto pertence. */
  description?: string | null;
  /** ISO 8601 de quando a foto foi publicada. */
  createdAt?: string | null;
  /** Mostra a lixeira desta foto. */
  canDelete?: boolean;
};

export type PhotoViewerProps = {
  /** Abre o visualizador na foto deste índice; `null` fecha. */
  initialIndex: number | null;
  photos: PhotoViewerItem[];
  onClose: () => void;
  /**
   * Exclui a foto no servidor. Resolve `true` quando ela saiu; o visualizador
   * fecha sozinho quando não sobra nenhuma foto. Sem a prop, não há lixeira.
   */
  onDelete?: (photo: PhotoViewerItem) => Promise<boolean>;
  /** Toque no título — ex.: abrir o evento da foto. */
  onPressTitle?: (photo: PhotoViewerItem) => void;
};
