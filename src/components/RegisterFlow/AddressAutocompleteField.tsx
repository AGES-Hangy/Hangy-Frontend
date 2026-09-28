import { useEffect, useState } from 'react';

import { TextField } from '@/components/TextField';
import { useAddressSearch, type AddressSuggestion } from '@/hooks/useAddressSearch';
import { MapPickerModal } from '@/components/RegisterFlow/MapPickerModal';

type Props = {
  value: string;
  onSelect: (suggestion: AddressSuggestion) => void;
  onChangeText: (text: string) => void;
  error?: string;
};

/**
 * Campo Endereço da aba Empresa: `TextField type="Location"` com autocomplete
 * (Nominatim, debounced) enquanto digita, e o ícone à direita abre o
 * `MapPickerModal` pra selecionar com um pino no mapa.
 */
export function AddressAutocompleteField({ value, onSelect, onChangeText, error }: Props) {
  const [text, setText] = useState(value);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const { results, search } = useAddressSearch();

  useEffect(() => setText(value), [value]);

  function handleSelectResult(label: string) {
    const suggestion = results.find((result) => result.label === label);
    if (!suggestion) return;
    setText(suggestion.label);
    onSelect(suggestion);
  }

  return (
    <>
      <TextField
        type="Location"
        label="Endereço"
        placeholder="Selecione seu endereço"
        value={text}
        onChangeText={(nextText) => {
          setText(nextText);
          onChangeText(nextText);
          search(nextText);
        }}
        options={results.map((result, index) => ({ value: String(index), label: result.label }))}
        onSelectOption={(option) => handleSelectResult(option.label)}
        trailingIcon="chevron-down"
        onTrailingIconPress={() => setIsMapOpen(true)}
        onTrailingIconPressAccessibilityLabel="Selecionar localização no mapa"
        error={error}
      />
      <MapPickerModal
        visible={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onConfirm={(suggestion) => {
          setText(suggestion.label);
          onSelect(suggestion);
          setIsMapOpen(false);
        }}
      />
    </>
  );
}
