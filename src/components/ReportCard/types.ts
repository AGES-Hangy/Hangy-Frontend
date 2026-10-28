import type { BadgeModerationProps } from '@/components/BadgeModeration';

/** Eixo `Target` do COMPONENT_SET ReportCard do Figma. */
export type ReportCardTarget = 'Pessoa' | 'Evento';

export type ReportCardProps = {
  target: ReportCardTarget;
  /** Nome da pessoa ou título do evento denunciado. */
  targetName: string;
  /** Foto da pessoa ou capa do evento. Sem URL (ou se falhar), mostra o ícone. */
  targetImageUrl?: string | null;
  /**
   * Linha de apoio abaixo do nome, como no Figma ("3 denúncias · há 2 h",
   * "Organizado por Marina S. · há 5 h"). Opcional: a task não lista essa prop.
   */
  subtitle?: string;
  moderationStatus: BadgeModerationProps['value'];
  /** Motivo já traduzido, ex. "Assédio ou discurso de ódio". */
  reason: string;
  /** Trecho do relato; trunca em 2 linhas. */
  descriptionExcerpt: string;
  reportNumber: number;
  onPress?: () => void;
};
