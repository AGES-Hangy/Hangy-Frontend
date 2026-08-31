import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TextField } from '@/components/TextField';
import { spacing } from '@/constants/layout';

const DESCRIPTION_MAX_LENGTH = 1000;

export default function CriarEventoPt1() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  return (
    <View style={styles.container}>
      <TextField
        label="Nome do evento*"
        placeholder="Ex.: Futebol na PUC"
        value={name}
        onChangeText={setName}
      />

      <TextField
        type="TextArea"
        label="Descrição"
        placeholder="Conte um pouco sobre o evento"
        value={description}
        onChangeText={setDescription}
        maxLength={DESCRIPTION_MAX_LENGTH}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing[16],
    paddingTop: spacing[16],
    gap: spacing[24],
  },
});