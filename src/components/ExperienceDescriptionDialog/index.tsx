import { useEffect, useState } from 'react';

import { Dialog } from '@/components/Dialog';
import { TextField } from '@/components/TextField';
import { EXPERIENCE_DESCRIPTION_MAX_LENGTH } from '@/hooks/useExperiencePhotos';

export type ExperienceDescriptionDialogProps = {
  visible: boolean;
  /** `create`: antes da primeira foto; `edit`: troca o texto já publicado. */
  mode: 'create' | 'edit';
  /** Texto inicial a cada abertura. */
  initialValue?: string;
  onConfirm: (description: string) => void;
  onCancel: () => void;
  isLoading?: boolean;
};

const COPY = {
  create: {
    title: 'Conte como foi',
    description: 'O texto acompanha todas as suas fotos deste evento. Dá para editar depois.',
    confirmLabel: 'Enviar foto',
  },
  edit: {
    title: 'Editar descrição',
    description: 'O texto vale para todas as suas fotos deste evento.',
    confirmLabel: 'Salvar',
  },
} as const;

/**
 * Descrição da experiência (1 a 1000 caracteres, exigida pelo backend): pedida
 * no primeiro envio de foto do evento e editável pela foto em tela cheia.
 */
export function ExperienceDescriptionDialog({
  visible,
  mode,
  initialValue = '',
  onConfirm,
  onCancel,
  isLoading = false,
}: ExperienceDescriptionDialogProps) {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const trimmed = value.trim();
  const copy = COPY[mode];

  return (
    <Dialog
      visible={visible}
      variant="SendRequest"
      title={copy.title}
      description={copy.description}
      confirmLabel={copy.confirmLabel}
      cancelLabel="Cancelar"
      confirmDisabled={trimmed.length === 0 || (mode === 'edit' && trimmed === initialValue.trim())}
      isLoading={isLoading}
      onConfirm={() => onConfirm(trimmed)}
      onCancel={onCancel}
    >
      <TextField
        type="TextArea"
        label="Descrição"
        required
        placeholder="Como foi o evento pra você?"
        value={value}
        onChangeText={setValue}
        maxLength={EXPERIENCE_DESCRIPTION_MAX_LENGTH}
        hint={`${value.length}/${EXPERIENCE_DESCRIPTION_MAX_LENGTH}`}
        disabled={isLoading}
      />
    </Dialog>
  );
}
