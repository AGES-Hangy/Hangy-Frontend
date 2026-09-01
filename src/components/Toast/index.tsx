import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { CircleCheck, CircleAlert, TriangleAlert, Info, X } from 'lucide-react-native/icons';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextData {
  addToast: (message: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextData>({} as ToastContextData);

export const useToast = () => useContext(ToastContext);

const toastConfig = {
  success: {
    icon: <CircleCheck size={20} color="#128A54" />,
    style: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
    textStyle: { color: '#128A54' },
  },
  error: {
    icon: <CircleAlert size={20} color="#D33A45" />,
    style: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
    textStyle: { color: '#D33A45' },
  },
  warning: {
    icon: <TriangleAlert size={20} color="#E8590C" />,
    style: { backgroundColor: '#ffedd5', borderColor: '#fed7aa' },
    textStyle: { color: '#E8590C' },
  },
  info: {
    icon: <Info size={20} color="#2F6FE4" />,
    style: { backgroundColor: '#dbeafe', borderColor: '#bfdbfe' },
    textStyle: { color: '#2F6FE4' },
  },
};

const ToastItem: React.FC<{ message: ToastMessage; onRemove: (id: string) => void }> = ({ message, onRemove }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const { icon, style, textStyle } = toastConfig[message.type];

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => onRemove(message.id));
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Animated.View style={[styles.toastContainer, style, { opacity }]}>
      {icon}
      <Text style={[styles.text, textStyle]}>{message.message}</Text>
      <TouchableOpacity onPress={() => onRemove(message.id)}>
        <X size={20} color={textStyle.color} opacity={0.6} />
      </TouchableOpacity>
    </Animated.View>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const addToast = useCallback(({ type, message }: Omit<ToastMessage, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setMessages((state) => [...state, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setMessages((state) => state.filter((msg) => msg.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
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
  queueContainer: { position: 'absolute', bottom: 40, left: 16, right: 16, zIndex: 9999, gap: 8 },
  toastContainer: { flexDirection: 'row', alignItems: 'center', height: 56, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6, marginBottom: 8 },
  text: { flex: 1, fontSize: 14, fontWeight: '500', marginLeft: 12, marginRight: 12 },
});