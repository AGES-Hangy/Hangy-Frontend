import { useEffect, useState } from 'react';

import { TextField } from '@/components/TextField';
import { useAddressSearch, type AddressSuggestion } from '@/hooks/useAddressSearch';
import { MapPickerModal } from './MapPickerModal';

type Props = {
  value: string;
  onSelect: (suggestion: AddressSuggestion) => void;
  onChangeText: (text: string) => void;
  error?: string;
  /** Sem valor, o campo não desenha label — usado quando a tela já tem um `FieldLabel` externo. */
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  reserveMessageSpace?: boolean;
  accessibilityLabel?: string;
};

/**
 * Campo de endereço reutilizado no cadastro (aba Empresa) e no local do
 * evento: `TextField type="Location"` com autocomplete (Nominatim, debounced)
 * enquanto digita, e o ícone à direita abre o `MapPickerModal` pra selecionar
 * com um pino no mapa.
 */
export function AddressAutocompleteField({
  value,
  onSelect,
  onChangeText,
  error,
  label,
  placeholder = 'Selecione seu endereço',
  disabled,
  maxLength,
  reserveMessageSpace,
  accessibilityLabel,
}: Props) {
  const [text, setText] = useState(value);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const { results, search } = useAddressSearch();

  // O texto exibido após escolher uma sugestão vem do pai (`value`): cada tela
  // decide se mostra o endereço completo ou o nome curto.
  useEffect(() => setText(value), [value]);

  function handleSelectResult(label: string) {
    const suggestion = results.find((result) => result.label === label);
    if (!suggestion) return;
    onSelect(suggestion);
  }

  return (
    <>
      <TextField
        type="Location"
        label={label}
        placeholder={placeholder}
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
        disabled={disabled}
        maxLength={maxLength}
        reserveMessageSpace={reserveMessageSpace}
        accessibilityLabel={accessibilityLabel}
      />
      <MapPickerModal
        visible={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onConfirm={(suggestion) => {
          onSelect(suggestion);
          setIsMapOpen(false);
        }}
      />
    </>
  );
}
