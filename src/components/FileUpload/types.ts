export type FileUploadValue = { uri: string };

export type FileUploadProps = {
  /** Rótulo à esquerda do cabeçalho. */
  label?: string;
  /** Texto à direita do cabeçalho. */
  badge?: string;
  /** Arquivo já enviado — presença liga o estado `Filled`. */
  value?: FileUploadValue | null;
  /** 0–100. A presença liga o estado `Uploading`. */
  progress?: number;
  /** Mensagem de recusa — a presença liga o estado `Error`. */
  error?: string;
  /** Abre o seletor de imagem. */
  onPick?: () => void;
  /** Remove a capa enviada, no estado `Filled`. */
  onRemove?: () => void;
  /** Cancela o envio em andamento, no estado `Uploading`. */
  onCancel?: () => void;
};
