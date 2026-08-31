import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react-native';

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
        icon: <CheckCircle2 size={20} color="#15803d" />,
        style: { backgroundColor: '#dcfce7', borderColor: '#bbf7d0' },
        textStyle: { color: '#166534' },
    },
    error: {
        icon: <AlertCircle size={20} color="#b91c1c" />,
        style: { backgroundColor: '#fee2e2', borderColor: '#fecaca' },
        textStyle: { color: '#991b1b' },
    },
    warning: {
        icon: <AlertTriangle size={20} color="#c2410c" />,
        style: { backgroundColor: '#ffedd5', borderColor: '#fed7aa' },
        textStyle: { color: '#9a3412' },
    },
    info: {
        icon: <Info size={20} color="#1d4ed8" />,
        style: { backgroundColor: '#dbeafe', borderColor: '#bfdbfe' },
        textStyle: { color: '#1e40af' },
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
            { }
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
        bottom: 40,
        left: 16,
        right: 16,
        zIndex: 9999,
        gap: 8,
    },
    toastContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 56,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        marginBottom: 8,
    },
    text: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 12,
        marginRight: 12,
    },
});