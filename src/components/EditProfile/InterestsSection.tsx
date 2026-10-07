import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { Dialog } from '@/components/Dialog';
import { Modal } from '@/components/Modal';
import { SectionHeader } from '@/components/SectionHeader';
import { TagGroup } from '@/components/TagGroup';
import { TagPickerGroup } from '@/components/TagPickerGroup';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import type { TagSelection } from '@/components/EditProfile/types';
import type { TagNode } from '@/hooks/useTags';
import type { UserType } from '@/types/event';

const COPY = {
  PERSONAL: {
    areasText: (minimum: number) =>
      `Escolha ao menos ${minimum} áreas. O feed da Home é montado a partir delas.`,
    refineText: 'Dentro de cada área, marque o que você curte de verdade.',
    areaText: (area: string) => `Marque o que você curte em ${area}.`,
  },
  BUSINESS: {
    areasText: () => 'Escolha as áreas dos eventos do seu estabelecimento. Elas ajudam a divulgar seus eventos.',
    refineText: 'Dentro de cada área, marque os tipos de evento que você oferece.',
    areaText: (area: string) => `Marque os tipos de evento de ${area} que você oferece.`,
  },
} as const;

/**
 * Passo do modal aberto. É um modal só, que troca de conteúdo: encadear dois
 * modais nativos (um fechando, outro abrindo) falha no iOS.
 */
type ModalStep =
  /** "Adicionar áreas": grade com todas as áreas. */
  | { kind: 'areas'; macroDraft: string[] }
  /** "Afine seus interesses": micro só das áreas novas. */
  | { kind: 'refine'; macroDraft: string[]; newMacroIds: string[]; microDraft: string[] }
  /** "Interesses de <área>": micro de uma área que já está no perfil. */
  | { kind: 'area'; macroId: string; microDraft: string[] };

type Props = {
  userType: UserType;
  tree: TagNode[];
  isLoading: boolean;
  /** Falha ao carregar a árvore de tags. */
  loadError: string | null;
  onRetry: () => void;
  selection: TagSelection;
  /** Os modais só mexem na seleção local; quem grava é o "Salvar alterações". */
  onChange: (selection: TagSelection) => void;
  minimumAreas: number;
  /** Salvamento em voo: chips e ações bloqueados. */
  disabled: boolean;
  /** Erro da seleção atual (validação ou resposta do `PUT`). */
  error: string | null;
};

function toggle(ids: string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((current) => current !== id) : [...ids, id];
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`;
}

/** Bloco de interesses de Editar perfil: áreas (macro) com as micro agrupadas dentro. */
export function InterestsSection({
  userType,
  tree,
  isLoading,
  loadError,
  onRetry,
  selection,
  onChange,
  minimumAreas,
  disabled,
  error,
}: Props) {
  const [openModal, setModal] = useState<ModalStep | null>(null);
  // O conteúdo continua desenhado enquanto o modal some (fade), em vez de
  // esvaziar no primeiro frame do fechamento.
  const lastModal = useRef<ModalStep | null>(null);
  if (openModal) lastModal.current = openModal;
  const modal = openModal ?? lastModal.current;
  const [areaToRemove, setAreaToRemove] = useState<TagNode | null>(null);

  const copy = COPY[userType];
  const selectedAreas = tree.filter((macro) => selection.macroIds.includes(macro.id));
  // Com o mínimo de áreas no perfil, nenhuma pode sair: o × some do chip macro.
  // ⚠️ Estado ainda sem frame no Figma (pendência registrada na task 072).
  const canRemoveArea = selection.macroIds.length > minimumAreas;

  function removeArea(area: TagNode) {
    const removed = new Set(area.children.map((leaf) => leaf.id));
    onChange({
      macroIds: selection.macroIds.filter((id) => id !== area.id),
      microIds: selection.microIds.filter((id) => !removed.has(id)),
    });
    setAreaToRemove(null);
  }

  /** Aplica a escolha de áreas: as que saíram levam as micro junto. */
  function applyAreas(macroDraft: string[], addedMicroIds: string[]) {
    const kept = new Set(
      tree.filter((macro) => macroDraft.includes(macro.id)).flatMap((macro) => macro.children.map((leaf) => leaf.id)),
    );
    onChange({
      macroIds: macroDraft,
      microIds: [...selection.microIds.filter((id) => kept.has(id)), ...addedMicroIds],
    });
    setModal(null);
  }

  function handleModalPrimary() {
    if (!modal) return;

    if (modal.kind === 'areas') {
      const newMacroIds = modal.macroDraft.filter((id) => !selection.macroIds.includes(id));
      if (newMacroIds.length === 0) {
        applyAreas(modal.macroDraft, []);
        return;
      }
      setModal({ kind: 'refine', macroDraft: modal.macroDraft, newMacroIds, microDraft: [] });
      return;
    }

    if (modal.kind === 'refine') {
      applyAreas(modal.macroDraft, modal.microDraft);
      return;
    }

    const area = tree.find((macro) => macro.id === modal.macroId);
    const areaMicroIds = new Set(area?.children.map((leaf) => leaf.id));
    onChange({
      macroIds: selection.macroIds,
      microIds: [...selection.microIds.filter((id) => !areaMicroIds.has(id)), ...modal.microDraft],
    });
    setModal(null);
  }

  function renderModal() {
    if (!modal) return null;

    if (modal.kind === 'areas') {
      return (
        <>
          <Text style={styles.modalText}>{copy.areasText(minimumAreas)}</Text>
          <View style={styles.chips}>
            {tree.map((macro) => (
              <Chip
                key={macro.id}
                label={macro.name}
                categoryType="macro"
                isSelected={modal.macroDraft.includes(macro.id)}
                onPress={() => setModal({ ...modal, macroDraft: toggle(modal.macroDraft, macro.id) })}
              />
            ))}
          </View>
          <Text style={styles.counter}>
            {modal.macroDraft.length} de {tree.length} selecionadas
          </Text>
        </>
      );
    }

    if (modal.kind === 'refine') {
      return (
        <>
          <Text style={styles.modalText}>{copy.refineText}</Text>
          {tree
            .filter((macro) => modal.newMacroIds.includes(macro.id))
            .map((macro) => (
              <TagPickerGroup key={macro.id} label={macro.name}>
                {macro.children.map((leaf) => (
                  <Chip
                    key={leaf.id}
                    label={leaf.name}
                    categoryType="micro"
                    isSelected={modal.microDraft.includes(leaf.id)}
                    onPress={() => setModal({ ...modal, microDraft: toggle(modal.microDraft, leaf.id) })}
                  />
                ))}
              </TagPickerGroup>
            ))}
        </>
      );
    }

    const area = tree.find((macro) => macro.id === modal.macroId);
    if (!area) return null;

    return (
      <>
        <Text style={styles.modalText}>{copy.areaText(area.name)}</Text>
        <TagPickerGroup label={area.name}>
          {area.children.map((leaf) => (
            <Chip
              key={leaf.id}
              label={leaf.name}
              categoryType="micro"
              isSelected={modal.microDraft.includes(leaf.id)}
              onPress={() => setModal({ ...modal, microDraft: toggle(modal.microDraft, leaf.id) })}
            />
          ))}
        </TagPickerGroup>
      </>
    );
  }

  const modalArea = modal?.kind === 'area' ? tree.find((macro) => macro.id === modal.macroId) : undefined;
  const modalTitle =
    modal?.kind === 'areas'
      ? 'Adicionar áreas'
      : modal?.kind === 'refine'
        ? 'Afine seus interesses'
        : `Interesses de ${modalArea?.name ?? ''}`;
  const modalPrimaryLabel =
    modal?.kind === 'areas'
      ? modal.macroDraft.some((id) => !selection.macroIds.includes(id))
        ? 'Continuar'
        : 'Salvar áreas'
      : 'Salvar interesses';
  // Cada área nova precisa sair do modal com pelo menos uma micro — é o que o
  // `PUT /users/me/tags` grava.
  const modalPrimaryDisabled =
    modal?.kind === 'areas'
      ? modal.macroDraft.length < minimumAreas
      : modal?.kind === 'refine'
        ? tree
            .filter((macro) => modal.newMacroIds.includes(macro.id))
            .some((macro) => !macro.children.some((leaf) => modal.microDraft.includes(leaf.id)))
        : false;

  const removedMicroNames = areaToRemove
    ? areaToRemove.children.filter((leaf) => selection.microIds.includes(leaf.id)).map((leaf) => leaf.name)
    : [];

  return (
    <View style={styles.section}>
      <SectionHeader title="INTERESSES" variant="overline" />
      <Text style={styles.help}>
        Mínimo de {minimumAreas} {minimumAreas === 1 ? 'área' : 'áreas'}. Ao remover uma área, os
        interesses dela também saem.
      </Text>

      {isLoading ? (
        <View style={styles.chips} accessibilityLabel="Carregando interesses">
          {[96, 128, 80, 112].map((width, index) => (
            <View key={index} style={[styles.skeletonChip, { width }]} />
          ))}
        </View>
      ) : loadError ? (
        <View style={styles.loadError}>
          <Text style={styles.error}>{loadError}</Text>
          <Button label="Tentar de novo" variant="Secondary" size="MD" onPress={onRetry} />
        </View>
      ) : (
        <>
          {selectedAreas.map((area) => (
            <TagGroup
              key={area.id}
              label={area.name}
              disabled={disabled}
              onRemove={canRemoveArea ? () => setAreaToRemove(area) : undefined}
            >
              {area.children
                .filter((leaf) => selection.microIds.includes(leaf.id))
                .map((leaf) => {
                  const remove = () =>
                    onChange({
                      macroIds: selection.macroIds,
                      microIds: selection.microIds.filter((id) => id !== leaf.id),
                    });

                  return (
                    <Chip
                      key={leaf.id}
                      label={leaf.name}
                      categoryType="micro"
                      isSelected
                      showRemoveIcon
                      disabled={disabled}
                      onRemove={remove}
                      onPress={remove}
                      accessibilityLabel={`Remover ${leaf.name}`}
                    />
                  );
                })}
              <Chip
                label="+ Adicionar"
                disabled={disabled}
                accessibilityLabel={`Adicionar interesses em ${area.name}`}
                onPress={() =>
                  setModal({
                    kind: 'area',
                    macroId: area.id,
                    microDraft: area.children
                      .filter((leaf) => selection.microIds.includes(leaf.id))
                      .map((leaf) => leaf.id),
                  })
                }
              />
            </TagGroup>
          ))}

          <Chip
            label="+ Adicionar área"
            disabled={disabled}
            accessibilityLabel="Adicionar área"
            onPress={() => setModal({ kind: 'areas', macroDraft: selection.macroIds })}
          />
        </>
      )}

      {error && (
        <Text style={styles.error} accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </Text>
      )}

      <Modal
        visible={openModal !== null}
        title={modalTitle}
        onClose={() => setModal(null)}
        primaryLabel={modalPrimaryLabel}
        onPrimaryPress={handleModalPrimary}
        primaryDisabled={modalPrimaryDisabled}
      >
        {renderModal()}
      </Modal>

      <Dialog
        visible={areaToRemove !== null}
        variant="RemoveTagArea"
        title={`Remover ${areaToRemove?.name ?? 'área'}?`}
        description={
          removedMicroNames.length > 0
            ? `${removedMicroNames.length === 1 ? 'O interesse dessa área' : 'Os interesses dessa área'} (${joinNames(removedMicroNames)}) também ${removedMicroNames.length === 1 ? 'será removido' : 'serão removidos'} do seu perfil.`
            : 'A área será removida do seu perfil.'
        }
        cancelLabel="Cancelar"
        onConfirm={() => areaToRemove && removeArea(areaToRemove)}
        onCancel={() => setAreaToRemove(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing[12],
  },
  help: {
    ...typography.bodyS,
    color: colors.text.secondary,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  // Mesma altura do Chip MD (36), para o bloco não pular quando a árvore chega.
  skeletonChip: {
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface.sunken,
  },
  loadError: {
    alignItems: 'flex-start',
    gap: spacing[8],
  },
  error: {
    ...typography.bodyS,
    color: colors.feedback.error,
  },
  modalText: {
    ...typography.bodyM,
    color: colors.text.secondary,
  },
  counter: {
    ...typography.bodyS,
    color: colors.text.tertiary,
  },
});
