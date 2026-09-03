import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Icon } from '@/components/Icon';
import { IconButton } from '@/components/IconButton';
import { palette } from '@/constants/colors';
import { elevation, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { colors } from '@/constants/colors';
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

export interface AddToastOptions {
  type: ToastType;
  message?: string;
  eventName?: string;
}

interface ToastContextData {
  addToast: (options: AddToastOptions) => void;
  removeToast: (id: string) => void;
  showSuccessToast: (eventName: string) => void;
  showErrorToast: (message?: string) => void;
  showWarningToast: (message?: string) => void;
  showInfoToast: (message?: string) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);
const BORDER_WIDTH = 1.5;

export const useToast = () => useContext(ToastContext);

const defaultToastMessages = {
  success: (eventName?: string) =>
    eventName ? `Presença confirmada em ${eventName}.` : 'Presença confirmada.',
  error: () => 'Não foi possível enviar a solicitação.',
  warning: () => 'Este evento está quase lotado.',
  info: () => 'Você será avisado quando o dono aprovar.',
};

const toastConfig = {
  success: {
    icon: <Icon name="circle-check" size={20} color={palette.success.default} />,
    style: {
      backgroundColor: palette.success.bg,
      borderWidth: BORDER_WIDTH,
      borderColor: palette.success.border,
    },
    textStyle: { color: colors.text.primary },
    accessibilityLabelPrefix: 'Sucesso: ',
  },
  error: {
    icon: <Icon name="circle-alert" size={20} color={palette.error.default} />,
    style: {
      backgroundColor: palette.error.bg,
      borderWidth: BORDER_WIDTH,
      borderColor: palette.error.border,
    },
    textStyle: { color: colors.text.primary },
    accessibilityLabelPrefix: 'Erro: ',
  },
  warning: {
    icon: <Icon name="triangle-alert" size={20} color={palette.warning.default} />,
    style: {
      backgroundColor: palette.warning.bg,
      borderWidth: BORDER_WIDTH,
      borderColor: palette.warning.border,
    },
    textStyle: { color: colors.text.primary },
    accessibilityLabelPrefix: 'Aviso: ',
  },
  info: {
    icon: <Icon name="info" size={20} color={palette.info.default} />,
    style: {
      backgroundColor: palette.info.bg,
      borderWidth: BORDER_WIDTH,
      borderColor: palette.info.border,
    },
    textStyle: { color: colors.text.primary },
    accessibilityLabelPrefix: 'Informação: ',
  },
};

const ToastItem: React.FC<{ message: ToastMessage; onRemove: (id: string) => void }> = ({ message, onRemove }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const { icon, style, textStyle, accessibilityLabelPrefix } = toastConfig[message.type];

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onRemove(message.id));
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${accessibilityLabelPrefix}${message.message}`}
      style={[styles.toastContainer, style, { opacity }]}
    >
      {icon}
      <Text style={[styles.text, textStyle]}>{message.message}</Text>
      <IconButton
        icon={<Icon name="x" size={18} color={palette.neutral[700]} />}
        size="SM"
        variant="Ghost"
        accessibilityLabel="Fechar notificação"
        onPress={() => onRemove(message.id)}
        style={{ width: 24, height: 24 }}
      />
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = useCallback(({ type, message, eventName }: AddToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    const resolvedMessage =
      message ||
      (type === 'success'
        ? defaultToastMessages.success(eventName)
        : defaultToastMessages[type]());

    setMessages((state) => [...state, { id, type, message: resolvedMessage }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setMessages((state) => state.filter((msg) => msg.id !== id));
  }, []);

  const showSuccessToast = useCallback(
    (eventName: string) => {
      addToast({ type: 'success', eventName });
    },
    [addToast]
  );

  const showErrorToast = useCallback(
    (message?: string) => {
      addToast({ type: 'error', message });
    },
    [addToast]
  );

  const showWarningToast = useCallback(
    (message?: string) => {
      addToast({ type: 'warning', message });
    },
    [addToast]
  );

  const showInfoToast = useCallback(
    (message?: string) => {
      addToast({ type: 'info', message });
    },
    [addToast]
  );

  return (
    <ToastContext.Provider
      value={{
        addToast,
        removeToast,
        showSuccessToast,
        showErrorToast,
        showWarningToast,
        showInfoToast,
      }}
    >
      {children}
      <View style={styles.queueContainer} pointerEvents="box-none">
        {messages.map((msg) => (
          <ToastItem key={msg.id} message={msg} onRemove={removeToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  queueContainer: {
    position: 'absolute',
    bottom: spacing[40],
    left: spacing[16],
    right: spacing[16],
    zIndex: 9999,
    gap: spacing[8],
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingHorizontal: spacing[16],
    borderRadius: radius.md,
    marginBottom: spacing[8],
    ...elevation[2],
  },
  text: {
    flex: 1,
    ...typography.bodyM,
    fontWeight: '500',
    marginLeft: spacing[12],
    marginRight: spacing[12],
  },
});