// MinhaTela.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useToast } from '@/components/Toast';

export default function MinhaTela() {
    // Pegando a função addToast do contexto
    const { addToast } = useToast();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Teste de Toasts</Text>

            <TouchableOpacity
                style={[styles.button, { backgroundColor: '#15803d' }]}
                onPress={() => addToast({ type: 'success', message: 'Operação realizada com sucesso!' })}
            >
                <Text style={styles.buttonText}>Mostrar Sucesso</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, { backgroundColor: '#b91c1c' }]}
                onPress={() => addToast({ type: 'error', message: 'Ops! Ocorreu um erro ao salvar.' })}
            >
                <Text style={styles.buttonText}>Mostrar Erro</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, { backgroundColor: '#c2410c' }]}
                onPress={() => addToast({ type: 'warning', message: 'Atenção: sua sessão vai expirar.' })}
            >
                <Text style={styles.buttonText}>Mostrar Alerta</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.button, { backgroundColor: '#1d4ed8' }]}
                onPress={() => addToast({ type: 'info', message: 'Nova atualização disponível.' })}
            >
                <Text style={styles.buttonText}>Mostrar Info</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
    },
    button: {
        width: '100%',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    }
});