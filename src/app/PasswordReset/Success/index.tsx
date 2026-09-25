import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Image } from 'expo-image';

import { Button } from '@/components/Button';
import { Icon } from '@/components/Icon';
import { useToast } from '@/components/Toast';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

export default function PasswordResetSuccess() {
	const { showInfoToast } = useToast();

	function goToLogin() {
		showInfoToast('Senha redefinida com sucesso. Entre com sua nova senha.');
		router.replace('/Login');
	}

	return (
		<View style={styles.screen}>
			<StatusBar style="light" />
			<View style={styles.brandArea}>
				<Image source={require('../../../../assets/images/logo.svg')} style={styles.logo} contentFit="contain" accessibilityLabel="Hangy" />
			</View>
			<View style={styles.panel}>
				<ScrollView contentContainerStyle={styles.panelContent}>
					<View style={styles.confirmation}>
						<View style={styles.successIcon}>
							<Icon name="circle-check" size={48} color={colors.feedback.success} />
						</View>
						<Text style={styles.title}>Senha redefinida com sucesso</Text>
						<Text style={styles.description}>Agora você já pode entrar com sua nova senha.</Text>
					</View>
					<Button label="Ir para o login" onPress={goToLogin} />
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
	panelContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing[24], paddingTop: spacing[24], paddingBottom: spacing[40], gap: spacing[32] },
	confirmation: { alignItems: 'center', gap: spacing[16] },
	successIcon: { width: spacing[64], height: spacing[64], alignItems: 'center', justifyContent: 'center' },
	title: { ...typography.h2, color: colors.text.primary, textAlign: 'center' },
	description: { ...typography.bodyS, color: colors.text.secondary, textAlign: 'center' },
});
