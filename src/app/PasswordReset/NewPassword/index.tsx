import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useToast } from '@/components/Toast';
import { clearPasswordResetToken, usePasswordReset } from '@/hooks/usePasswordReset';

export default function PasswordResetNewPassword() {
	const [password, setPassword] = useState('');
	const [confirmation, setConfirmation] = useState('');
	const [didBlurPassword, setDidBlurPassword] = useState(false);
	const [didBlurConfirmation, setDidBlurConfirmation] = useState(false);
	const [tokenExpired, setTokenExpired] = useState(false);
	const { resetPassword, isLoading, error, clearError } = usePasswordReset();
	const { showErrorToast } = useToast();
	const passwordValid = password.length >= 8;
	const confirmationValid = confirmation === password && confirmation.length > 0;
	const canSubmit = passwordValid && confirmationValid;
	const passwordValidationError = error?.validationErrors.find((item) => item.field === 'new_password' || item.field === 'password');
	const requestErrorMessage = error?.kind === 'network'
		? 'Sem conexão com a internet.'
		: error?.kind === 'timeout'
			? 'A conexão demorou demais. Tente novamente.'
			: error?.status && error.status >= 500
				? 'Não foi possível carregar. Tente de novo.'
				: null;

	useFocusEffect(useCallback(() => () => clearPasswordResetToken(), []));

	function goBack() {
		clearPasswordResetToken();
		router.back();
	}

	async function submitPassword() {
		if (!canSubmit || isLoading) return;
		const result = await resetPassword(password);
		if (result.ok) {
			router.replace('/PasswordReset/Success');
			return;
		}
		if (
			result.failure.status === 401 ||
			(result.failure.status === 400 && result.failure.detail === 'Invalid or expired reset token')
		) {
			setTokenExpired(true);
		} else if (result.failure.kind === 'timeout') {
			showErrorToast('A conexão demorou demais. Tente novamente.');
		}
	}

	if (tokenExpired) {
		return (
			<View style={styles.expiredScreen}>
				<StatusBar style="dark" />
				<View style={styles.expiredIcon}>
					<Icon name="circle-alert" size={48} color={colors.feedback.error} />
				</View>
				<Text style={styles.expiredTitle}>O código expirou</Text>
				<Text style={styles.expiredDescription}>Peça um novo código para redefinir sua senha.</Text>
				<Button
					label="Pedir novo código"
					onPress={() => {
						clearPasswordResetToken();
						router.replace('/PasswordReset');
					}}
					style={styles.expiredAction}
				/>
			</View>
		);
	}

	return (
		<View style={styles.screen}>
			<StatusBar style="light" />
			<View style={styles.brandArea}>
				<Image source={require('../../../../assets/images/logo.svg')} style={styles.logo} contentFit="contain" accessibilityLabel="Hangy" />
			</View>
			<View style={styles.panel}>
				<ScrollView contentContainerStyle={styles.panelContent} keyboardShouldPersistTaps="handled">
					<Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.back}>
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
								onChangeText={(value) => {
									setPassword(value);
									if (error) clearError();
								}}
								onBlur={() => setDidBlurPassword(true)}
								editable={!isLoading}
								placeholder="Digite sua nova senha"
								placeholderTextColor={colors.text.tertiary}
								secureTextEntry
								autoComplete="new-password"
								textContentType="newPassword"
								accessibilityLabel="Nova senha"
							/>
							{passwordValidationError ? (
								<Text style={styles.error}>{passwordValidationError.message}</Text>
							) : didBlurPassword && !passwordValid ? (
								<Text style={styles.error}>Use pelo menos 8 caracteres.</Text>
							) : null}
						</View>
						<View style={styles.fieldGroup}>
							<Text style={styles.fieldLabel}>Confirmar senha</Text>
							<TextInput
								style={styles.input}
								value={confirmation}
								onChangeText={setConfirmation}
								onBlur={() => setDidBlurConfirmation(true)}
								editable={!isLoading}
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
						{requestErrorMessage ? (
							<View style={styles.requestError} accessibilityRole="alert">
								<Text style={styles.error}>{requestErrorMessage}</Text>
								<Pressable onPress={submitPassword} accessibilityRole="button" accessibilityLabel="Tentar novamente" style={styles.retryAction}>
									<Text style={styles.retryText}>Tentar novamente</Text>
								</Pressable>
							</View>
						) : null}
						<Button label="Redefinir senha" disabled={!canSubmit || isLoading} isLoading={isLoading} onPress={submitPassword} />
					</View>
				</ScrollView>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	expiredScreen: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing[24],
		paddingVertical: spacing[40],
		gap: spacing[20],
		backgroundColor: palette.primary[50],
	},
	expiredIcon: {
		width: spacing[64],
		height: spacing[64],
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: radius.full,
		backgroundColor: palette.error.bg,
	},
	expiredTitle: { ...typography.h2, color: colors.text.primary, textAlign: 'center' },
	expiredDescription: { ...typography.bodyL, color: colors.text.secondary, textAlign: 'center' },
	expiredAction: { alignSelf: 'stretch', marginTop: spacing[12] },
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
	requestError: {
		gap: spacing[4],
		padding: spacing[12],
		borderWidth: 1,
		borderColor: palette.error.border,
		borderRadius: radius.md,
		backgroundColor: palette.error.bg,
	},
	retryAction: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingRight: spacing[12] },
	retryText: { ...typography.labelM, color: colors.feedback.error },
});
