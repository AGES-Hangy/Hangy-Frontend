import { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';

import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/Icon';
import type {
  TextFieldOption,
  TextFieldProps,
  TextFieldState,
  TextFieldType,
} from '@/components/TextField/types';
import { colors, palette } from '@/constants/colors';
import { elevation, radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';

/** Métricas da seção TextField da página Components do Figma. */
const FIELD_HEIGHT = 56;
const TEXT_AREA_HEIGHT = 120;
/** Largura mínima do campo, segundo a anotação do Figma. */
const MIN_WIDTH = 280;
const ICON_SIZE = 20;
const BORDER_WIDTH = 1.5;
/** Foco e erro engrossam a borda — é o que dá o "salto" visual do foco. */
const BORDER_WIDTH_EMPHASIS = 2;
/** Altura máxima da lista de opções antes de ela rolar. */
const DROPDOWN_MAX_HEIGHT = 208;

type TypeConfig = {
  leadingIcon?: IconName;
  trailingIcon?: IconName;
  /** `false` nos tipos que abrem um seletor em vez de aceitar digitação. */
  editable: boolean;
  multiline?: boolean;
  secure?: boolean;
  keyboardType?: KeyboardTypeOptions;
  /** Tipos que abrem a lista de opções ao focar. */
  hasDropdown?: boolean;
  /** Tipos cuja altura acompanha o conteúdo, em vez de travar em 56. */
  growsWithContent?: boolean;
};

const TYPES: Record<TextFieldType, TypeConfig> = {
  Text: { editable: true },
  Search: { leadingIcon: 'search', editable: true },
  Password: { leadingIcon: 'lock', editable: true, secure: true },
  Date: { trailingIcon: 'calendar', editable: false },
  Tags: {
    leadingIcon: 'flag',
    trailingIcon: 'chevron-down',
    editable: false,
    hasDropdown: true,
    growsWithContent: true,
  },
  Location: { leadingIcon: 'map-pin', editable: true, hasDropdown: true },
  TextArea: { editable: true, multiline: true },
  Select: { trailingIcon: 'chevron-down', editable: false, hasDropdown: true },
};

type StateVisual = {
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  labelColor: string;
  valueColor: string;
  messageColor: string;
};

const STATES: Record<TextFieldState, StateVisual> = {
  Default: {
    backgroundColor: colors.bg.base,
    borderColor: palette.neutral[300],
    borderWidth: BORDER_WIDTH,
    labelColor: palette.neutral[700],
    valueColor: colors.text.primary,
    messageColor: colors.text.secondary,
  },
  Filled: {
    backgroundColor: colors.bg.base,
    borderColor: palette.neutral[300],
    borderWidth: BORDER_WIDTH,
    labelColor: palette.neutral[700],
    valueColor: colors.text.primary,
    messageColor: colors.text.secondary,
  },
  Focused: {
    backgroundColor: colors.bg.base,
    borderColor: colors.action.primary,
    borderWidth: BORDER_WIDTH_EMPHASIS,
    labelColor: palette.neutral[700],
    valueColor: colors.text.primary,
    messageColor: colors.text.secondary,
  },
  Error: {
    backgroundColor: colors.bg.base,
    borderColor: palette.error.default,
    borderWidth: BORDER_WIDTH_EMPHASIS,
    labelColor: palette.neutral[700],
    valueColor: colors.text.primary,
    messageColor: palette.error.default,
  },
  Success: {
    backgroundColor: colors.bg.base,
    borderColor: palette.success.default,
    borderWidth: BORDER_WIDTH,
    labelColor: palette.neutral[700],
    valueColor: colors.text.primary,
    messageColor: palette.success.default,
  },
  Disabled: {
    backgroundColor: colors.surface.sunken,
    borderColor: palette.neutral[200],
    borderWidth: BORDER_WIDTH,
    labelColor: colors.text.disabled,
    valueColor: colors.text.disabled,
    messageColor: colors.text.disabled,
  },
};

/** Ícone de status que o estado acrescenta à direita, sobre o do tipo. */
const STATE_ICONS: Partial<Record<TextFieldState, { name: IconName; color: string }>> = {
  Error: { name: 'triangle-alert', color: palette.error.default },
  Success: { name: 'check', color: palette.success.default },
};

function resolveState({
  disabled,
  error,
  success,
  focused,
  hasValue,
}: {
  disabled: boolean;
  error?: string;
  success?: string;
  focused: boolean;
  hasValue: boolean;
}): TextFieldState {
  if (disabled) return 'Disabled';
  if (error) return 'Error';
  if (success) return 'Success';
  if (focused) return 'Focused';
  return hasValue ? 'Filled' : 'Default';
}

/**
 * Cor dos ícones do campo. No estado Focused os dois lados escurecem para
 * text/primary; fora dele o ícone da esquerda é uma dica (tertiary) e o da
 * direita é uma ação (secondary).
 */
function resolveIconColor(state: TextFieldState, side: 'leading' | 'trailing'): string {
  if (state === 'Disabled') return colors.text.disabled;
  if (state === 'Focused') return colors.text.primary;
  return side === 'leading' ? colors.text.tertiary : colors.text.secondary;
}

/**
 * Campo de formulário do Design System — 8 tipos e 6 estados.
 *
 * O estado não é uma prop: sai de `disabled`, `error`, `success`, do foco e de
 * o campo ter valor.
 *
 * ```tsx
 * <TextField label="E-mail" placeholder="seuemail@exemplo.com" value={email} onChangeText={setEmail} />
 * <TextField type="Password" label="Senha" value={senha} onChangeText={setSenha} error={erroSenha} />
 * <TextField type="Select" label="Cidade" options={cidades} onSelectOption={setCidade} />
 * ```
 */
export function TextField({
  type = 'Text',
  label,
  value = '',
  onChangeText,
  placeholder,
  helper,
  error,
  success,
  disabled = false,
  reserveMessageSpace = false,
  options,
  onSelectOption,
  tags,
  onPress,
  maxLength,
  accessibilityLabel,
  style,
}: TextFieldProps) {
  const config = TYPES[type];
  const [focused, setFocused] = useState(false);
  const [isSecureHidden, setIsSecureHidden] = useState(true);

  const state = resolveState({ disabled, error, success, focused, hasValue: value.length > 0 });
  const visual = STATES[state];
  const stateIcon = STATE_ICONS[state];

  const message = error ?? success ?? helper;
  const showsMessageRow = message !== undefined || reserveMessageSpace;

  const isDropdownOpen = Boolean(config.hasDropdown && focused && options && options.length > 0);

  // Fecha a lista ao desmontar (ex.: navegar para outra tela), senão ela fica
  // presa por cima da tela seguinte.
  useEffect(() => () => setFocused(false), []);

  const openOnPress = () => {
    if (disabled) return;
    if (config.hasDropdown) setFocused((current) => !current);
    onPress?.();
  };

  const handleSelectOption = (option: TextFieldOption) => {
    onSelectOption?.(option);
    setFocused(false);
  };

  const fieldBody = (
    <View
      style={[
        styles.field,
        {
          backgroundColor: visual.backgroundColor,
          borderColor: visual.borderColor,
          borderWidth: visual.borderWidth,
          alignItems: config.multiline ? 'flex-start' : 'center',
        },
        config.multiline && { height: TEXT_AREA_HEIGHT },
        // Tags cresce conforme os chips quebram linha; os demais tipos ficam
        // travados na altura 56 do Figma.
        !config.multiline && (config.growsWithContent
          ? { minHeight: FIELD_HEIGHT }
          : { height: FIELD_HEIGHT }),
      ]}
    >
      {config.leadingIcon && (
        <Icon
          name={config.leadingIcon}
          size={ICON_SIZE}
          color={resolveIconColor(state, 'leading')}
        />
      )}

      <View style={styles.inputArea}>
        {tags}

        <TextInput
          style={[
            typography.bodyL,
            styles.input,
            { color: visual.valueColor },
            config.multiline && styles.inputMultiline,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={disabled ? colors.text.disabled : colors.text.tertiary}
          editable={config.editable && !disabled}
          // Nos tipos que abrem seletor o toque tem que chegar no Pressable de
          // fora, em vez de o TextInput engolir e abrir o teclado.
          pointerEvents={config.editable ? 'auto' : 'none'}
          multiline={config.multiline}
          secureTextEntry={config.secure && isSecureHidden}
          keyboardType={config.keyboardType}
          maxLength={maxLength}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled }}
        />
      </View>

      {config.multiline && maxLength !== undefined && (
        <Text style={[typography.caption, styles.counter, { color: palette.neutral[400] }]}>
          {value.length}/{maxLength}
        </Text>
      )}

      {config.secure && (
        <Pressable
          onPress={() => setIsSecureHidden((hidden) => !hidden)}
          disabled={disabled}
          hitSlop={spacing[12]}
          accessibilityRole="button"
          accessibilityLabel={isSecureHidden ? 'Mostrar senha' : 'Ocultar senha'}
        >
          <Icon
            name={isSecureHidden ? 'eye' : 'eye-off'}
            size={ICON_SIZE}
            color={resolveIconColor(state, 'trailing')}
          />
        </Pressable>
      )}

      {stateIcon ? (
        <Icon name={stateIcon.name} size={ICON_SIZE} color={stateIcon.color} />
      ) : (
        config.trailingIcon && (
          <Icon
            name={config.trailingIcon}
            size={ICON_SIZE}
            color={resolveIconColor(state, 'trailing')}
          />
        )
      )}
    </View>
  );

  return (
    // Com a lista aberta o campo inteiro sobe de camada: no React Native o
    // zIndex do dropdown só vale entre irmãos, entao sem isto os campos
    // seguintes do formulario sao pintados por cima dela.
    <View style={[styles.container, isDropdownOpen && styles.containerAbove, style]}>
      {label && <Text style={[typography.labelM, { color: visual.labelColor }]}>{label}</Text>}

      {config.editable ? (
        fieldBody
      ) : (
        <Pressable
          onPress={openOnPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityState={{ disabled, expanded: isDropdownOpen }}
        >
          {fieldBody}
        </Pressable>
      )}

      {showsMessageRow && (
        <Text style={[typography.bodyS, styles.message, { color: visual.messageColor }]}>
          {message ?? ''}
        </Text>
      )}

      {isDropdownOpen && (
        <View style={styles.dropdown}>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScroll}>
            {options?.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => handleSelectOption(option)}
                accessibilityRole="button"
                accessibilityLabel={option.label}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <Text style={[typography.bodyL, { color: colors.text.primary }]}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minWidth: MIN_WIDTH,
    gap: spacing[4],
    // A lista de opções é posicionada em cima do que vem depois, sem empurrar
    // o resto do formulário.
    position: 'relative',
  },
  containerAbove: {
    zIndex: 2,
    // O Android empilha por elevation, não por zIndex.
    elevation: 2,
  },
  field: {
    flexDirection: 'row',
    gap: spacing[12],
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[16],
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  inputArea: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing[8],
  },
  input: {
    flex: 1,
    minWidth: 0,
    padding: 0,
  },
  inputMultiline: {
    height: '100%',
    textAlignVertical: 'top',
  },
  counter: {
    position: 'absolute',
    right: spacing[16],
    bottom: spacing[12],
  },
  message: {
    // Reserva uma linha desde o inicio: sem isso o formulario inteiro pula
    // quando a primeira mensagem de erro aparece.
    minHeight: typography.bodyS.lineHeight,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: colors.bg.base,
    borderWidth: BORDER_WIDTH,
    borderColor: palette.neutral[200],
    borderRadius: radius.md,
    paddingVertical: spacing[8],
    overflow: 'hidden',
    ...elevation[2],
  },
  dropdownScroll: {
    maxHeight: DROPDOWN_MAX_HEIGHT,
  },
  option: {
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
  },
  optionPressed: {
    backgroundColor: colors.bg.subtle,
  },
});

export type {
  TextFieldOption,
  TextFieldProps,
  TextFieldState,
  TextFieldType,
} from '@/components/TextField/types';
