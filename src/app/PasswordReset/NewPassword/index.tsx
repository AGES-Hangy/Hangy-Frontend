import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';

import { Button } from '@/components/Button';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

export default function PasswordResetNewPassword() {
	const [password, setPassword] = useState('');
	const [confirmation, setConfirmation] = useState('');
	const [didBlurPassword, setDidBlurPassword] = useState(false);
	const [didBlurConfirmation, setDidBlurConfirmation] = useState(false);
	const passwordValid = password.length >= 8;
	const confirmationValid = confirmation === password && confirmation.length > 0;
	const canSubmit = passwordValid && confirmationValid;

	return (
		<View style={styles.screen}>
			<StatusBar style="light" />
			<View style={styles.brandArea}>
				<Image source={require('../../../../assets/images/logo.svg')} style={styles.logo} contentFit="contain" accessibilityLabel="Hangy" />
			</View>
			<View style={styles.panel}>
				<ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
					<Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.back}>
						<Text style={styles.backText}>‹ Voltar</Text>
					</Pressable>
					<View style={styles.heading}>
						<Text style={styles.title}>Crie uma nova senha</Text>
						<Text style={styles.description}>Escolha uma senha segura para sua conta.</Text>
					</View>
					<View style={styles.form}>
						<View style={styles.fieldGroup}>
							<Text style={styles.fieldLabel}>Nova senha</Text>
							<TextInput
								style={styles.input}
								value={password}
								onChangeText={setPassword}
								onBlur={() => setDidBlurPassword(true)}
								placeholder="Digite sua nova senha"
								placeholderTextColor={colors.text.tertiary}
								secureTextEntry
								autoComplete="new-password"
								textContentType="newPassword"
								accessibilityLabel="Nova senha"
							/>
							{didBlurPassword && !passwordValid ? <Text style={styles.error}>Use pelo menos 8 caracteres.</Text> : null}
						</View>
						<View style={styles.fieldGroup}>
							<Text style={styles.fieldLabel}>Confirmar senha</Text>
							<TextInput
								style={styles.input}
								value={confirmation}
								onChangeText={setConfirmation}
								onBlur={() => setDidBlurConfirmation(true)}
								placeholder="Digite a senha novamente"
								placeholderTextColor={colors.text.tertiary}
								secureTextEntry
								autoComplete="new-password"
								textContentType="newPassword"
								accessibilityLabel="Confirme sua nova senha"
								accessibilityHint={didBlurConfirmation && confirmation.length > 0 && !confirmationValid ? 'As senhas precisam ser iguais.' : undefined}
							/>
							{didBlurConfirmation && confirmation.length > 0 && !confirmationValid ? (
								<Text style={styles.error}>As senhas não conferem.</Text>
							) : null}
						</View>
						<Button label="Redefinir senha" disabled={!canSubmit} onPress={() => router.replace('/PasswordReset/Success')} />
					</View>
				</ScrollView>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.action.primary },
	brandArea: { height: '26.5%', alignItems: 'center', justifyContent: 'center' },
	logo: { width: 224, height: 76 },
	panel: { flex: 1, backgroundColor: palette.primary[50], borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, overflow: 'hidden' },
	panelContent: { flexGrow: 1, paddingHorizontal: spacing[24], paddingTop: spacing[16], paddingBottom: spacing[40] },
	back: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: spacing[8] },
	backText: { ...typography.labelM, color: palette.primary[600] },
	heading: { alignItems: 'center', gap: spacing[8], marginTop: spacing[16], marginBottom: spacing[24] },
	title: { ...typography.h2, color: colors.text.primary, textAlign: 'center' },
	description: { ...typography.bodyS, color: colors.text.secondary, textAlign: 'center' },
	form: { gap: spacing[16] },
	fieldGroup: { gap: spacing[8] },
	fieldLabel: { ...typography.labelM, color: colors.text.secondary },
	input: { height: 56, paddingHorizontal: spacing[16], borderWidth: 1, borderColor: colors.border.strong, borderRadius: radius.md, backgroundColor: colors.bg.base, color: colors.text.primary, ...typography.bodyM },
	error: { ...typography.bodyS, color: colors.feedback.error },
});
