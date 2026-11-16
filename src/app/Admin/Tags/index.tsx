import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { EmptyState } from '@/components/EmptyState';
import { ErrorScreen } from '@/components/ErrorScreen';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SectionHeader } from '@/components/SectionHeader';
import { Skeleton } from '@/components/Skeleton';
import { TopAppBar } from '@/components/TopAppBar';
import { colors } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useRefreshable } from '@/hooks/useRefreshable';
import { useTags } from '@/hooks/useTags';
import type { TagNode } from '@/hooks/useTags';

/** O `OfflineBanner` é absoluto (top 8 + altura mínima 48), como no Painel. */
const OFFLINE_BANNER_OFFSET = spacing[64];
/** Altura do `Chip` `md`; o componente não exporta a constante. */
const CHIP_HEIGHT = 36;
const SKELETON_SECTIONS = [4, 3, 2];

/** Sem histórico (link direto, refresh na Web), voltar cai no Painel. */
function goBack() {
  if (router.canGoBack()) router.back();
  else router.replace('/Admin/Painel');
}

function TagsSkeleton() {
  return (
    <View
      style={styles.content}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Carregando tags e categorias"
      accessibilityState={{ busy: true }}
    >
      {SKELETON_SECTIONS.map((chipCount, section) => (
        <View key={section} style={styles.section}>
          <Skeleton width="40%" height={14} radius="full" />
          <View style={styles.chips}>
            {Array.from({ length: chipCount }, (_, index) => (
              <Skeleton key={index} width={72} height={CHIP_HEIGHT} radius="full" />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function CategorySection({ category }: { category: TagNode }) {
  return (
    <View style={styles.section}>
      <View style={{ paddingRight: spacing[16] }}>
        <SectionHeader
            title={`${category.name.toLocaleUpperCase('pt-BR')} (${category.children.length})`}
            variant="overline"
            action
            actionLabel="Editar"
            showActionIcon={false}
            actionAccessibilityLabel={`Editar categoria ${category.name}`}
            onActionPress={() =>
              router.push({
                pathname: '/Admin/Tags/[categoryId]/Editar',
                params: { categoryId: category.id },
              })
            }
        />
      </View>
      <View style={styles.chips}>
        {category.children.map((tag) => (
          // Só leitura: o `Chip` não tem modo não interativo, então tiro o papel de botão.
          <Chip
            key={tag.id}
            label={tag.name}
            categoryType="micro"
            size="md"
            accessibilityRole="text"
            activeOpacity={1}
          />
        ))}
      </View>
    </View>
  );
}

export default function AdminTags() {
  const { tags, isLoading, error, refetch } = useTags();
  const { isOffline } = useNetworkStatus();
  const { isRefreshing, onRefresh } = useRefreshable(refetch);
  const hasFocusedOnce = useRef(false);

  // O `useTags` já busca ao montar; ao voltar de um formulário (`router.back()`) a tela
  // continua montada, então refaz o `GET /tags/tree` a cada foco depois do primeiro.
  useFocusEffect(
    useCallback(() => {
      if (!hasFocusedOnce.current) {
        hasFocusedOnce.current = true;
        return;
      }
      void refetch();
    }, [refetch]),
  );

  const hasTags = tags.length > 0;

  function renderContent() {
    // Um refetch não troca a lista por skeleton: só a primeira carga (sem dados) faz isso.
    if (!hasTags && isLoading) return <TagsSkeleton />;

    if (!hasTags && error) {
      return (
        <ErrorScreen
          title={isOffline ? 'Sem conexão' : 'Não foi possível carregar'}
          message={isOffline ? 'Sem conexão com a internet' : 'Não foi possível carregar. Tente de novo.'}
          tone={isOffline ? 'warning' : 'error'}
          action={{ label: 'Tentar de novo', onPress: () => void refetch(), isLoading }}
        />
      );
    }

    if (!hasTags) {
      return (
        <EmptyState
          context="Search"
          icon="plus"
          title="Nenhuma categoria ainda"
          text="Crie a primeira categoria para organizar as tags."
          cta
          ctaLabel="Criar categoria"
          ctaDisabled={isOffline}
          onCtaPress={() => router.push('/Admin/Tags/NovaCategoria')}
          fill
        />
      );
    }

    return (
      <>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.action.primary}
              colors={[colors.action.primary]}
            />
          }
        >
          {tags.map((category) => (
            <CategorySection key={category.id} category={category} />
          ))}
        </ScrollView>

        {/* Lado a lado (row, FILL), como o par primário/secundário da denúncia (task 261). */}
        <View style={styles.footer}>
          <Button
            label="Criar categoria"
            size="LG"
            disabled={isOffline}
            onPress={() => router.push('/Admin/Tags/NovaCategoria')}
            style={styles.footerButton}
          />
          <Button
            label="Criar tag"
            variant="Secondary"
            size="LG"
            disabled={isOffline}
            onPress={() => router.push('/Admin/Tags/Nova')}
            style={styles.footerButton}
          />
        </View>
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <TopAppBar variant="Detail" title="Tags e categorias" applyTopInset={false} onBack={goBack} />
      <View style={styles.body}>
        <View style={[styles.body, isOffline && styles.bodyBelowBanner]}>{renderContent()}</View>
        {isOffline && <OfflineBanner />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg.base },
  body: { flex: 1 },
  bodyBelowBanner: { paddingTop: OFFLINE_BANNER_OFFSET },
  content: { padding: spacing[16], gap: spacing[16] },
  section: { gap: spacing[8] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[8] },
  // A `AdminNav` fica logo abaixo e já cuida da safe area.
  footer: {
    flexDirection: 'row',
    gap: spacing[8],
    padding: spacing[16],
    backgroundColor: colors.bg.base,
  },
  footerButton: { flex: 1, minWidth: 0 },
});