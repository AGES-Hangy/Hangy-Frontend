import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';

import { Button } from '@/components/Button';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useToast } from '@/components/Toast';
import { usePasswordReset } from '@/hooks/usePasswordReset';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RATE_LIMIT_FALLBACK_SECONDS = 180;

export default function PasswordReset() {
	const [email, setEmail] = useState('');
	const [didBlur, setDidBlur] = useState(false);
	const [retrySeconds, setRetrySeconds] = useState(0);
	const { requestCode, isLoading, error, clearError } = usePasswordReset();
	const { showErrorToast, showWarningToast } = useToast();
	const isEmailValid = EMAIL_PATTERN.test(email.trim());
	const emailValidationError = error?.validationErrors.find((item) => item.field === 'email');
	const requestErrorMessage = error?.status === 429
		? 'Muitas tentativas. Espere alguns minutos.'
		: error?.kind === 'network'
			? 'Sem conexão com a internet.'
			: error?.kind === 'timeout'
				? 'A conexão demorou demais. Tente novamente.'
				: error?.status !== null && error?.status !== undefined && error.status >= 500
					? 'Não foi possível carregar. Tente de novo.'
					: null;

	useEffect(() => {
		if (retrySeconds === 0) return;
		const timer = setInterval(() => setRetrySeconds((seconds) => Math.max(0, seconds - 1)), 1000);
		return () => clearInterval(timer);
	}, [retrySeconds]);

	async function continueToCode() {
		if (!isEmailValid || isLoading || retrySeconds > 0) return;
		const result = await requestCode(email.trim());
		if (result.ok) {
			router.push({ pathname: '/PasswordReset/Code', params: { email: email.trim() } });
			return;
		}

		if (result.failure.status === 429) {
			setRetrySeconds(result.failure.retryAfterSeconds ?? RATE_LIMIT_FALLBACK_SECONDS);
			showWarningToast('Muitas tentativas. Espere alguns minutos.');
		} else if (result.failure.kind === 'timeout') {
			showErrorToast('A conexão demorou demais. Tente novamente.');
		}
	}

	return (
		<View style={styles.screen}>
			<StatusBar style="light" />
			<View style={styles.brandArea}>
				<Image
					source={require('../../../assets/images/logo.svg')}
					style={styles.logo}
					contentFit="contain"
					accessibilityLabel="Hangy"
				/>
			</View>

			<View style={styles.panel}>
				<ScrollView
					contentContainerStyle={styles.panelContent}
					keyboardShouldPersistTaps="handled"
				>
					<View style={styles.heading}>
						<Text style={styles.title}>Recuperar senha</Text>
						<Text style={styles.description}>
							Enviaremos um código de redefinição para o e-mail cadastrado.
						</Text>
					</View>

					<View style={styles.form}>
						<View style={styles.fieldGroup}>
							<Text style={styles.fieldLabel}>E-mail</Text>
							<TextInput
								style={[styles.emailInput, emailValidationError && styles.fieldInputError]}
								placeholder="email@email.com"
								placeholderTextColor={colors.text.tertiary}
								value={email}
								onChangeText={(value) => {
									setEmail(value);
									if (error) clearError();
								}}
								onBlur={() => setDidBlur(true)}
								autoCapitalize="none"
								autoComplete="email"
								keyboardType="email-address"
								accessibilityLabel="E-mail para recuperar a senha"
								accessibilityHint={emailValidationError?.message ?? (didBlur && email.length > 0 && !isEmailValid ? 'Digite um e-mail válido.' : undefined)}
							/>
							{emailValidationError || (didBlur && email.length > 0 && !isEmailValid) ? (
								<Text style={styles.fieldError} accessibilityLiveRegion="polite">
									{emailValidationError?.message ?? 'Digite um e-mail válido.'}
								</Text>
							) : null}
						</View>
						{requestErrorMessage ? (
							<View style={styles.requestError} accessibilityRole="alert">
								<Text style={styles.requestErrorText}>{requestErrorMessage}</Text>
								{error?.status !== 429 ? (
									<Pressable
										onPress={continueToCode}
										accessibilityRole="button"
										accessibilityLabel="Tentar novamente"
										style={styles.retryAction}
									>
										<Text style={styles.retryText}>Tentar novamente</Text>
									</Pressable>
								) : null}
							</View>
						) : null}
						<Button
							label={retrySeconds > 0 ? `Aguarde ${retrySeconds}s` : 'Enviar código'}
							size="LG"
							disabled={!isEmailValid || retrySeconds > 0}
							isLoading={isLoading}
							onPress={continueToCode}
							style={styles.submit}
						/>
						<Pressable
							onPress={() => router.replace('/Login')}
							accessibilityRole="button"
							accessibilityLabel="Voltar para o login"
							style={styles.loginLink}
						>
							<Text style={styles.loginLinkText}>Voltar para o login</Text>
						</Pressable>
					</View>
				</ScrollView>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	screen: { flex: 1, backgroundColor: colors.action.primary },
	brandArea: {
		height: '26.5%',
		alignItems: 'center',
		justifyContent: 'center',
	},
	logo: { width: 224, height: 76 },
	panel: {
		flex: 1,
		backgroundColor: palette.primary[50],
		borderTopLeftRadius: radius.lg,
		borderTopRightRadius: radius.lg,
		overflow: 'hidden',
	},
	panelContent: {
		flexGrow: 1,
		paddingHorizontal: spacing[24],
		paddingTop: spacing[24],
		paddingBottom: spacing[40],
	},
	heading: { alignItems: 'center', gap: spacing[12], marginBottom: spacing[32] },
	title: { ...typography.h2, color: colors.text.primary, textAlign: 'center' },
	description: {
		...typography.bodyS,
		color: colors.text.secondary,
		textAlign: 'center',
		maxWidth: 320,
	},
	form: { gap: spacing[16] },
	fieldGroup: { gap: spacing[8] },
	fieldLabel: { ...typography.labelM, color: colors.text.secondary },
	emailInput: {
		height: 56,
		paddingHorizontal: spacing[16],
		borderWidth: 1,
		borderColor: colors.border.strong,
		borderRadius: radius.md,
		backgroundColor: colors.bg.base,
		color: colors.text.primary,
		...typography.bodyM,
	},
	fieldError: { ...typography.bodyS, color: colors.feedback.error },
	fieldInputError: { borderColor: colors.feedback.error },
	requestError: {
		gap: spacing[4],
		padding: spacing[12],
		borderWidth: 1,
		borderColor: palette.error.border,
		borderRadius: radius.md,
		backgroundColor: palette.error.bg,
	},
	requestErrorText: { ...typography.bodyS, color: colors.feedback.error },
	retryAction: { minHeight: 44, alignSelf: 'flex-start', justifyContent: 'center', paddingRight: spacing[12] },
	retryText: { ...typography.labelM, color: colors.feedback.error },
	submit: { alignSelf: 'stretch' },
	loginLink: {
		minHeight: 44,
		alignItems: 'center',
		justifyContent: 'center',
		alignSelf: 'center',
		paddingHorizontal: spacing[12],
	},
	loginLinkText: { ...typography.labelM, color: palette.primary[600] },
});
