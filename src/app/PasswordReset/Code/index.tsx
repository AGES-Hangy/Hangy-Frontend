import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';

import { Button } from '@/components/Button';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

const RESEND_DELAY_SECONDS = 30;

function maskEmail(email: string) {
	const [name, domain] = email.split('@');
	if (!name || !domain) return email;
	return `${name.slice(0, 2)}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
}

export default function PasswordResetCode() {
	const { email: emailParam } = useLocalSearchParams<{ email?: string }>();
	const email = typeof emailParam === 'string' ? emailParam : '';
	const [code, setCode] = useState('');
	const [secondsLeft, setSecondsLeft] = useState(RESEND_DELAY_SECONDS);

	useEffect(() => {
		if (secondsLeft === 0) return;
		const timer = setInterval(() => setSecondsLeft((seconds) => Math.max(0, seconds - 1)), 1000);
		return () => clearInterval(timer);
	}, [secondsLeft]);

	function confirmCode() {
		if (code.length !== 6) return;
		router.push('/PasswordReset/NewPassword');
	}

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
						<Text style={styles.title}>Verifique seu e-mail</Text>
						<Text style={styles.description}>Enviamos um código de redefinição para</Text>
						<Text style={styles.email}>{maskEmail(email)}</Text>
					</View>
					<View style={styles.form}>
						<View style={styles.fieldGroup}>
							<Text style={styles.fieldLabel}>Código de verificação</Text>
							<TextInput
								style={styles.codeInput}
								value={code}
								onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
								placeholder="000000"
								placeholderTextColor={colors.text.tertiary}
								keyboardType="number-pad"
								maxLength={6}
								autoComplete="one-time-code"
								textContentType="oneTimeCode"
								accessibilityLabel="Código de verificação de seis dígitos"
							/>
						</View>
						<Button label="Confirmar código" disabled={code.length !== 6} onPress={confirmCode} />
						<Pressable
							onPress={() => setSecondsLeft(RESEND_DELAY_SECONDS)}
							disabled={secondsLeft > 0}
							accessibilityRole="button"
							accessibilityLabel={secondsLeft > 0 ? `Reenviar código em ${secondsLeft} segundos` : 'Reenviar código'}
							accessibilityState={{ disabled: secondsLeft > 0 }}
							style={styles.resend}
						>
							<Text style={[styles.resendText, secondsLeft > 0 && styles.resendDisabled]}>
								{secondsLeft > 0 ? `Reenviar código em ${secondsLeft}s` : 'Reenviar código'}
							</Text>
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
	resend: { minHeight: 44, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: spacing[12] },
	resendText: { ...typography.labelM, color: palette.primary[600] },
	resendDisabled: { color: colors.text.tertiary },
});
