import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useToast } from '@/components/Toast';
import { Button } from '@/components/Button';
import { IconButton } from '@/components/IconButton';
import { colors } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

export default function TelaToast() {
  const {
    showSuccessToast,
    showErrorToast,
    showWarningToast,
    showInfoToast,
    addToast,
  } = useToast();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size="MD"
            variant="Ghost"
            accessibilityLabel="Voltar"
            onPress={() => router.canGoBack() ? router.back() : router.replace('/Login')}
          />
          <View style={styles.headerTitles}>
            <Text style={styles.title}>Toast Showcase</Text>
            <Text style={styles.subtitle}>Teste visual dos tipos de Toast e notificações</Text>
          </View>
        </View>

        {/* Seção de Toasts Rápidos / Padrão */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mensagens Padrão</Text>
          <Text style={styles.sectionDescription}>
            Dispara toasts utilizando os métodos auxiliares pré-configurados do hook useToast.
          </Text>

          <View style={styles.buttonList}>
            <Button
              label="Toast de Sucesso"
              icon="circle-check"
              variant="Primary"
              size="MD"
              onPress={() => showSuccessToast('Futebol de Sexta')}
            />

            <Button
              label="Toast de Erro"
              icon="circle-alert"
              variant="Danger"
              size="MD"
              onPress={() => showErrorToast()}
            />

            <Button
              label="Toast de Aviso"
              icon="triangle-alert"
              variant="Secondary"
              size="MD"
              onPress={() => showWarningToast()}
            />

            <Button
              label="Toast de Informação"
              icon="info"
              variant="Accent"
              size="MD"
              onPress={() => showInfoToast()}
            />
          </View>
        </View>

        {/* Seção de Toasts Customizados */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Mensagens Personalizadas</Text>
          <Text style={styles.sectionDescription}>
            Dispara toasts com textos customizados utilizando a função addToast.
          </Text>

          <View style={styles.buttonList}>
            <Button
              label="Sucesso Personalizado"
              icon="circle-check"
              variant="Primary"
              size="MD"
              onPress={() =>
                addToast({
                  type: 'success',
                  message: 'Perfil atualizado com sucesso!',
                })
              }
            />

            <Button
              label="Erro Personalizado"
              icon="circle-alert"
              variant="Danger"
              size="MD"
              onPress={() =>
                addToast({
                  type: 'error',
                  message: 'Falha na conexão com o servidor. Tente novamente.',
                })
              }
            />

            <Button
              label="Aviso Personalizado"
              icon="triangle-alert"
              variant="Secondary"
              size="MD"
              onPress={() =>
                addToast({
                  type: 'warning',
                  message: 'Sua sessão expirará em 5 minutos.',
                })
              }
            />

            <Button
              label="Info Personalizada"
              icon="info"
              variant="Accent"
              size="MD"
              onPress={() =>
                addToast({
                  type: 'info',
                  message: 'Novo evento adicionado perto de você.',
                })
              }
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  scrollContent: {
    padding: spacing[20],
    gap: spacing[24],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[12],
    paddingBottom: spacing[8],
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.bodyS,
    color: colors.text.secondary,
    marginTop: spacing[4],
  },
  section: {
    backgroundColor: colors.surface.sunken,
    borderRadius: radius.lg,
    padding: spacing[16],
    gap: spacing[12],
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text.primary,
  },
  sectionDescription: {
    ...typography.bodyS,
    color: colors.text.secondary,
    marginBottom: spacing[4],
  },
  buttonList: {
    gap: spacing[12],
  },
});