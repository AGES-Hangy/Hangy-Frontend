import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';

import { Button } from '@/components/Button';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useToast } from '@/components/Toast';
import { clearPasswordResetToken, usePasswordReset } from '@/hooks/usePasswordReset';

const RESEND_DELAY_SECONDS = 30;
const RATE_LIMIT_FALLBACK_SECONDS = 180;

function maskEmail(email: string) {
	const [name, domain] = email.split('@');
	if (!name || !domain) return email;
	return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export default function PasswordResetCode() {
	const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
	const email = typeof emailParam === 'string' ? emailParam : '';
	const [code, setCode] = useState('');
	const codeInputRef = useRef<TextInput>(null);
	const [secondsLeft, setSecondsLeft] = useState(RESEND_DELAY_SECONDS);
	const [isResending, setIsResending] = useState(false);
	const [resendError, setResendError] = useState<string | null>(null);
	const { verifyCode, requestCode, isLoading, error, clearError } = usePasswordReset();
	const { showErrorToast, showWarningToast } = useToast();
	const invalidCode = error?.status === 400 && error.detail === 'Invalid or expired code';
	const validationError = error?.validationErrors.find((item) => item.field === 'code');
	const codeError = invalidCode ? 'Código inválido ou expirado.' : validationError?.message;
	const confirmError = error?.kind === 'network'
		? 'Sem conexão com a internet.'
		: error?.kind === 'timeout'
			? 'A conexão demorou demais. Tente novamente.'
			: error?.status && error.status >= 500
				? 'Não foi possível carregar. Tente de novo.'
				: null;

	useEffect(() => {
		if (secondsLeft === 0) return;
		const timer = setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
		return () => clearInterval(timer);
	}, [secondsLeft]);

	async function confirmCode() {
		if (code.length !== 6 || isLoading) return;
		const result = await verifyCode(email, code);
		if (result.ok) {
			router.push('/PasswordReset/NewPassword');
			return;
		}
		if (result.failure.status === 400 && result.failure.detail === 'Invalid or expired code') {
			setCode('');
			requestAnimationFrame(() => codeInputRef.current?.focus());
		}
		if (result.failure.kind === 'timeout') {
			showErrorToast('A conexão demorou demais. Tente novamente.');
		}
	}

	function goBack() {
		clearPasswordResetToken();
		router.back();
	}

	async function resendCode() {
		if (secondsLeft > 0 || isLoading || !email) return;
		setIsResending(true);
		setResendError(null);
		const result = await requestCode(email);
		setIsResending(false);
		if (result.ok) {
			setCode('');
			setSecondsLeft(RESEND_DELAY_SECONDS);
			return;
		}
		if (result.failure.status === 429) {
			setSecondsLeft(result.failure.retryAfterSeconds ?? RATE_LIMIT_FALLBACK_SECONDS);
			showWarningToast('Muitas tentativas. Espere alguns minutos.');
		} else if (result.failure.kind === 'timeout') {
			setResendError('A conexão demorou demais. Tente novamente.');
			showErrorToast('A conexão demorou demais. Tente novamente.');
		} else if (result.failure.kind === 'network') {
			setResendError('Sem conexão com a internet.');
		} else if (result.failure.status && result.failure.status >= 500) {
			setResendError('Não foi possível carregar. Tente de novo.');
		} else {
			setResendError('Não foi possível reenviar o código. Tente novamente.');
		}
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
						<Text style={styles.title}>Verifique seu e-mail</Text>
						<Text style={styles.description}>Enviamos um código de redefinição para</Text>
						<Text style={styles.email}>{maskEmail(email)}</Text>
					</View>
					<View style={styles.form}>
						<View style={styles.fieldGroup}>
							<Text style={styles.fieldLabel}>Código de verificação</Text>
							<TextInput
								ref={codeInputRef}
								style={[styles.codeInput, codeError && styles.codeInputError]}
								value={code}
								onChangeText={(value) => {
									setCode(value.replace(/\D/g, '').slice(0, 6));
									setResendError(null);
									if (error) clearError();
								}}
								placeholder="000000"
								placeholderTextColor={colors.text.tertiary}
								keyboardType="number-pad"
								maxLength={6}
								autoComplete="one-time-code"
								textContentType="oneTimeCode"
								accessibilityLabel="Código de verificação de seis dígitos"
								accessibilityHint={codeError}
							/>
							{codeError ? (
								<Text style={styles.errorText} accessibilityLiveRegion="polite">{codeError}</Text>
							) : null}
						</View>
						{confirmError || resendError ? (
							<View style={styles.requestError} accessibilityRole="alert">
								<Text style={styles.errorText}>{resendError ?? confirmError}</Text>
								<Pressable
									onPress={resendError ? resendCode : confirmCode}
									accessibilityRole="button"
									accessibilityLabel="Tentar novamente"
									style={styles.retryAction}
								>
									<Text style={styles.retryText}>Tentar novamente</Text>
								</Pressable>
							</View>
						) : null}
						<Button
							label="Confirmar código"
							disabled={code.length !== 6 || isLoading}
							isLoading={isLoading && !isResending}
							onPress={confirmCode}
						/>
						<Pressable
							onPress={resendCode}
							disabled={secondsLeft > 0 || isLoading}
							accessibilityRole="button"
							accessibilityLabel={isResending ? 'Reenviando código' : secondsLeft > 0 ? `Reenviar código em ${secondsLeft} segundos` : 'Reenviar código'}
							accessibilityState={{ disabled: secondsLeft > 0 || isLoading, busy: isResending }}
							style={styles.resend}
						>
							{isResending ? (
								<ActivityIndicator size="small" color={palette.primary[600]} />
							) : (
								<Text style={[styles.resendText, secondsLeft > 0 && styles.resendDisabled]}>
									{secondsLeft > 0 ? `Reenviar código em ${secondsLeft}s` : 'Reenviar código'}
								</Text>
							)}
						</Pressable>
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
	heading: { alignItems: 'center', gap: spacing[8], marginTop: spacing[16], marginBottom: spacing[32] },
	title: { ...typography.h2, color: colors.text.primary, textAlign: 'center' },
	description: { ...typography.bodyS, color: colors.text.secondary, textAlign: 'center' },
	email: { ...typography.labelM, color: colors.text.primary, textAlign: 'center' },
	form: { gap: spacing[16] },
	fieldGroup: { gap: spacing[8] },
	fieldLabel: { ...typography.labelM, color: colors.text.secondary },
	codeInput: {
		height: 56,
		paddingHorizontal: spacing[16],
		borderWidth: 1,
		borderColor: colors.border.strong,
		borderRadius: radius.md,
		backgroundColor: colors.bg.base,
		color: colors.text.primary,
		textAlign: 'center',
		...typography.h3,
	},
	codeInputError: { borderColor: colors.feedback.error },
	errorText: { ...typography.bodyS, color: colors.feedback.error },
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
	resend: { minHeight: 44, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: spacing[12] },
	resendText: { ...typography.labelM, color: palette.primary[600] },
	resendDisabled: { color: colors.text.tertiary },
});
