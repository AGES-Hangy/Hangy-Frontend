import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Checkbox } from '@/components/Checkbox';
import { ProfileTabs } from '@/components/ProfileTabs';
import { colors, palette } from '@/constants/colors';
import { spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import type { Terms } from '@/hooks/useTerms';

type AccountType = 'pf' | 'pj';

const ACCOUNT_TYPE_ITEMS = [
  { value: 'pf' as const, label: 'Pessoa Física' },
  { value: 'pj' as const, label: 'Empresa' },
];

/** Título "Cadastrar" + Tabs Pessoa Física/Empresa — só nas duas etapas 1. */
export function AccountTypeHeader({
  value,
  onChange,
}: {
  value: AccountType;
  onChange: (value: AccountType) => void;
}) {
  return (
    <View style={styles.headerGroup}>
      <Text style={styles.title}>Cadastrar</Text>
      <ProfileTabs items={ACCOUNT_TYPE_ITEMS} value={value} onChange={onChange} variant="segmented" />
    </View>
  );
}

/** Título simples (etapa 2, sem Tabs) — mesma tipografia do H1 acima. */
export function StepTitle({ children }: { children: string }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function LoginLink() {
  return (
    <Pressable
      onPress={() => router.push('/Login')}
      accessibilityRole="link"
      accessibilityLabel="Já possui uma conta? Entre aqui"
      hitSlop={spacing[8]}
    >
      <Text style={styles.loginText}>
        Já possui uma conta? <Text style={styles.loginTextStrong}>Entre aqui</Text>
      </Text>
    </Pressable>
  );
}

/**
 * `useTerms` sobe até `Register` (dono do submit, que precisa de
 * `terms.version` pro `accepted_terms_version` do payload) e desce como prop
 * pra esta etapa — assim a árvore inteira compartilha a mesma busca, em vez
 * de cada `TermsCheckbox` buscar a sua.
 */
export type TermsBundle = {
  terms: Terms | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
};

/**
 * Checkbox de aceite dos termos — não existe em nenhum frame de etapa 2 do
 * Figma, mas o critério de aceite escrito é explícito ("botão só habilita com
 * termos aceitos"), então fica registrado aqui como decisão desta
 * implementação. Sem termos carregados (404/5xx), o campo fica bloqueado —
 * "sem termos não há aceite válido".
 */
export function TermsCheckbox({
  checked,
  onChange,
  termsBundle,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  termsBundle: TermsBundle;
}) {
  const { terms, isLoading, error, refetch } = termsBundle;

  return (
    <View style={styles.termsGroup}>
      <Checkbox
        checked={checked}
        onChange={onChange}
        disabled={isLoading || !terms}
        label={terms ? `Li e aceito os termos de uso (${terms.version})` : 'Li e aceito os termos de uso'}
      />
      {error && (
        <Pressable onPress={() => refetch()} accessibilityRole="button" accessibilityLabel="Tentar carregar os termos de novo">
          <Text style={styles.termsError}>{error} Toque para tentar de novo.</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerGroup: {
    gap: spacing[20],
  },
  title: {
    ...typography.h1,
    color: palette.primary[600],
    textAlign: 'center',
  },
  loginText: {
    ...typography.bodyM,
    color: palette.primary[500],
    textAlign: 'center',
  },
  loginTextStrong: {
    color: palette.primary[600],
    fontWeight: '600',
  },
  termsGroup: {
    gap: spacing[4],
  },
  termsError: {
    ...typography.bodyS,
    color: colors.feedback.error,
  },
});
