import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddressAutocompleteField } from '@/components/AddressAutocompleteField';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Dialog } from '@/components/Dialog';
import { InterestsSection } from '@/components/EditProfile/InterestsSection';
import { NotificationsSection } from '@/components/EditProfile/NotificationsSection';
import {
  BIO_MAX_LENGTH,
  MINIMUM_AREAS,
  buildInitialForm,
  buildInitialSelection,
  buildProfilePatch,
  isSameSelection,
  maskDocument,
  validateForm,
  validateSelection,
  type EditProfileFormState,
  type TagSelection,
} from '@/components/EditProfile/types';
import { FieldHint } from '@/components/FieldHint';
import { FLOATING_SAVE_BUTTON_HEIGHT, FloatingSaveButton } from '@/components/FloatingSaveButton';
import { SectionHeader } from '@/components/SectionHeader';
import { TextField } from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { colors, palette } from '@/constants/colors';
import { radius, spacing } from '@/constants/layout';
import { typography } from '@/constants/typography';
import { useBrazilianCities, useBrazilianStates } from '@/hooks/useBrazilLocations';
import type { CurrentUser } from '@/hooks/useCurrentUser';
import { useDeleteAccount } from '@/hooks/useDeleteAccount';
import { invalidateFeed } from '@/hooks/useFeed';
import type { TagNode } from '@/hooks/useTags';
import { useUnregisterDevice } from '@/hooks/useUnregisterDevice';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { useUserTags } from '@/hooks/useUserTags';
import type { BusinessProfile, PersonalProfile, UserTag } from '@/types/profile';
import { removeToken } from '@/utils/auth';
import { maskInstagramHandle, maskPhone } from '@/utils/documentValidation';
import type { EditProfileField, EditProfileFieldErrors } from '@/utils/profileErrors';
import { removePushToken } from '@/utils/pushToken';
import { normalizeForSearch } from '@/utils/text';

const COPY = {
  PERSONAL: {
    dataSection: 'DADOS PESSOAIS',
    nameLabel: 'Nome',
    documentLabel: 'CPF',
    documentHint: 'O CPF não pode ser alterado.',
    deleteTitle: 'Excluir sua conta?',
    deleteDescription:
      'Esta ação não pode ser desfeita. Seu perfil, conexões, fotos e eventos criados serão removidos permanentemente.',
  },
  BUSINESS: {
    dataSection: 'DADOS DO ESTABELECIMENTO',
    nameLabel: 'Nome fantasia',
    documentLabel: 'CNPJ',
    documentHint: 'O CNPJ não pode ser alterado.',
    deleteTitle: 'Excluir conta do estabelecimento?',
    deleteDescription:
      'Esta ação não pode ser desfeita. O perfil, os eventos criados e os seguidores serão removidos permanentemente.',
  },
} as const;

type Props = {
  user: CurrentUser;
  profile: PersonalProfile | BusinessProfile;
  userTags: UserTag[];
  tagsTree: {
    tags: TagNode[];
    isLoading: boolean;
    error: string | null;
    refetch: () => void;
  };
  /** A tela registra aqui o "fechar" do formulário, que o × da barra superior chama. */
  onRegisterClose: (close: (() => void) | null) => void;
};

function leaveScreen() {
  if (router.canGoBack()) router.back();
  else router.replace('/Profile');
}

/**
 * Formulário de Editar perfil, nas duas variantes (pessoa física e
 * estabelecimento). A tela monta este componente só depois de carregar tudo,
 * então o estado inicial sai direto das props.
 */
export function EditProfileForm({ user, profile, userTags, tagsTree, onRegisterClose }: Props) {
  const insets = useSafeAreaInsets();
  const { addToast, showErrorToast, showWarningToast } = useToast();
  const isBusiness = user.userType === 'BUSINESS';
  const copy = COPY[user.userType];
  const minimumAreas = MINIMUM_AREAS[user.userType];

  const [initial, setInitial] = useState<EditProfileFormState>(() => buildInitialForm(user, profile));
  const [form, setForm] = useState<EditProfileFormState>(initial);
  const [touched, setTouched] = useState<Partial<Record<EditProfileField, boolean>>>({});
  const [apiErrors, setApiErrors] = useState<EditProfileFieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);

  const [initialSelection, setInitialSelection] = useState<TagSelection>(() =>
    buildInitialSelection(userTags, tagsTree.tags),
  );
  const [selection, setSelection] = useState<TagSelection>(initialSelection);
  const [tagsApiError, setTagsApiError] = useState<string | null>(null);

  const [isDiscardOpen, setIsDiscardOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { updateProfile, isLoading: isUpdating } = useUpdateProfile();
  const { saveTags, isLoading: isSavingTags } = useUserTags();
  const { deleteAccount, isLoading: isDeleting } = useDeleteAccount();
  const { unregisterDevice } = useUnregisterDevice();

  const { states } = useBrazilianStates();
  const { cities } = useBrazilianCities(!isBusiness && form.stateUf ? form.stateUf : null);

  // O perfil guarda a UF; quando a lista do IBGE chega, o campo passa a
  // mostrar o nome do estado (se o usuário ainda não mexeu nele).
  useEffect(() => {
    const state = states.find((item) => item.uf === form.stateUf);
    if (state && form.stateLabel === form.stateUf) {
      setForm((current) => ({ ...current, stateLabel: state.name }));
    }
  }, [states, form.stateUf, form.stateLabel]);

  const validation = validateForm(user.userType, form, initial);
  const patch = buildProfilePatch(user.userType, form, initial);
  const isProfileChanged = Object.keys(patch).length > 0;
  const isTagsChanged = !isSameSelection(selection, initialSelection);
  // Seleção igual à salva não é validada: não marca o formulário como alterado.
  const selectionError = isTagsChanged ? validateSelection(selection, tagsTree.tags, minimumAreas) : null;

  const isDirty = isProfileChanged || isTagsChanged;
  const isSaving = isUpdating || isSavingTags;
  const isBlocked = isSaving || isDeleting;
  const canSave = isDirty && Object.keys(validation).length === 0 && selectionError === null && !isBlocked;

  function update(changes: Partial<EditProfileFormState>, ...fields: EditProfileField[]) {
    setForm((current) => ({ ...current, ...changes }));
    setBanner(null);
    // O erro que veio da API vale para o valor enviado: some ao editar o campo.
    if (fields.some((field) => apiErrors[field])) {
      setApiErrors((current) => {
        const next = { ...current };
        for (const field of fields) delete next[field];
        return next;
      });
    }
  }

  function touch(...fields: EditProfileField[]) {
    setTouched((current) => {
      const next = { ...current };
      for (const field of fields) next[field] = true;
      return next;
    });
  }

  /** Erro da API tem prioridade; a validação local só aparece depois do blur. */
  function errorOf(field: EditProfileField) {
    return apiErrors[field] ?? (touched[field] ? validation[field] : undefined);
  }

  function changeSelection(next: TagSelection) {
    setSelection(next);
    setTagsApiError(null);
  }

  const requestClose = useCallback(() => {
    if (isBlocked) return;
    if (isDirty) setIsDiscardOpen(true);
    else leaveScreen();
  }, [isBlocked, isDirty]);

  useEffect(() => {
    onRegisterClose(requestClose);
    return () => onRegisterClose(null);
  }, [onRegisterClose, requestClose]);

  // Voltar físico do Android: mesma pergunta de descarte do × da barra.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
        if (!isDirty && !isBlocked) return false;
        requestClose();
        return true;
      });
      return () => subscription.remove();
    }, [isDirty, isBlocked, requestClose]),
  );

  const handleSaveRef = useRef<() => void>(() => {});

  async function handleSave() {
    if (!canSave) return;
    setBanner(null);

    if (isProfileChanged) {
      const failure = await updateProfile(user.userType, patch);
      if (failure) {
        setApiErrors(failure.fieldErrors);
        setBanner(failure.banner ?? null);
        if (failure.toast) {
          addToast({
            type: 'error',
            message: failure.toast.message,
            ...(failure.toast.retry
              ? { actionLabel: 'Tentar de novo', onAction: () => handleSaveRef.current() }
              : null),
          });
        }
        return;
      }

      // O perfil já foi gravado: se as tags falharem a seguir, a nova tentativa
      // não reenvia o que já está salvo.
      const saved = { ...form, password: '', confirmPassword: '' };
      setInitial(saved);
      setForm(saved);
    }

    if (isTagsChanged) {
      const outcome = await saveTags(selection.microIds);
      if (outcome) {
        if (outcome.kind === 'inline') {
          setTagsApiError(outcome.message);
        } else {
          if (outcome.reloadTags) tagsTree.refetch();
          showWarningToast(outcome.message);
        }
        return;
      }
      setInitialSelection(selection);
    }

    // O feed da Home é montado a partir das tags e do perfil.
    invalidateFeed();
    addToast({ type: 'success', message: 'Perfil atualizado.' });
    leaveScreen();
  }
  handleSaveRef.current = () => void handleSave();

  async function handleDeleteAccount() {
    const deleted = await deleteAccount();
    setIsDeleteOpen(false);

    if (!deleted) {
      // Nada é apagado localmente antes do sucesso: conta e sessão continuam.
      showErrorToast('Não foi possível excluir sua conta. Tente de novo.');
      return;
    }

    await unregisterDevice({ isLoggingOut: true });
    await removePushToken();
    await removeToken();
    router.replace('/Login');
  }

  const stateOptions = states
    .filter((state) => normalizeForSearch(state.name).includes(normalizeForSearch(form.stateLabel)))
    .map((state) => ({ value: state.uf, label: state.name }));
  const cityOptions = cities
    .filter((city) => normalizeForSearch(city.name).includes(normalizeForSearch(form.city)))
    .map((city) => ({ value: String(city.id), label: city.name }));

  const document = maskDocument(
    user.userType,
    isBusiness ? (profile as BusinessProfile).cnpj : (profile as PersonalProfile).cpf,
  );

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.content,
            { paddingBottom: FLOATING_SAVE_BUTTON_HEIGHT + insets.bottom + spacing[16] },
          ]}
        >
          {banner && (
            <View style={styles.banner} accessibilityRole="alert" accessibilityLiveRegion="polite">
              <Text style={styles.bannerText}>{banner}</Text>
              <Button
                label="Tentar de novo"
                variant="Tertiary"
                size="SM"
                onPress={() => void handleSave()}
                disabled={!canSave}
              />
            </View>
          )}

          {/* ⚠️ Decisão pendente (task 072): o Figma traz "Trocar foto"/"Trocar
              logo", mas o modelo não tem foto de perfil. Até a decisão, o
              avatar aparece sem ação de troca e não há upload. */}
          <View style={styles.photo}>
            {isBusiness ? <Avatar variant="Store" size="MD" /> : <Avatar size="SM" />}
          </View>

          <View style={styles.section}>
            <SectionHeader title={copy.dataSection} variant="overline" />
            <TextField
              label={copy.nameLabel}
              value={form.name}
              onChangeText={(text) => update({ name: text }, 'name')}
              onBlur={() => touch('name')}
              error={errorOf('name')}
              disabled={isBlocked}
              autoCapitalize="words"
            />
            <TextField
              type="TextArea"
              label="Bio"
              value={form.bio}
              onChangeText={(text) => update({ bio: text }, 'bio')}
              onBlur={() => touch('bio')}
              error={errorOf('bio')}
              maxLength={BIO_MAX_LENGTH}
              disabled={isBlocked}
            />
            <TextField
              label="Telefone"
              placeholder="(51) 99999-9999"
              value={form.phone}
              onChangeText={(text) => update({ phone: maskPhone(text) }, 'phone')}
              onBlur={() => touch('phone')}
              error={errorOf('phone')}
              keyboardType="phone-pad"
              maxLength={15}
              disabled={isBlocked}
            />
            {isBusiness ? (
              <TextField
                label="Instagram"
                placeholder="@seuestabelecimento"
                value={form.instagram}
                onChangeText={(text) => update({ instagram: maskInstagramHandle(text) }, 'instagram')}
                onBlur={() => touch('instagram')}
                error={errorOf('instagram')}
                autoCapitalize="none"
                disabled={isBlocked}
              />
            ) : (
              <TextField
                type="Date"
                label="Data de nascimento"
                dateValue={form.dateOfBirth ?? undefined}
                onChangeDate={(date) => {
                  // Limpar o campo (Web) não apaga a data: ela é obrigatória no cadastro.
                  if (date) update({ dateOfBirth: date }, 'dateOfBirth');
                  touch('dateOfBirth');
                }}
                maximumDate={new Date()}
                error={errorOf('dateOfBirth')}
                disabled={isBlocked}
              />
            )}
          </View>

          <View style={[styles.section, styles.sectionAboveDropdowns]}>
            <SectionHeader title="LOCALIZAÇÃO" variant="overline" />
            {isBusiness ? (
              <AddressAutocompleteField
                label="Endereço"
                value={form.address}
                onChangeText={(address) => {
                  update({ address, latitude: null, longitude: null }, 'address');
                  touch('address');
                }}
                onSelect={(suggestion) => {
                  update(
                    { address: suggestion.label, latitude: suggestion.latitude, longitude: suggestion.longitude },
                    'address',
                  );
                  touch('address');
                }}
                error={errorOf('address')}
                disabled={isBlocked}
              />
            ) : (
              <>
                <TextField
                  type="Location"
                  label="Estado"
                  placeholder="Selecione seu estado"
                  value={form.stateLabel}
                  onChangeText={(text) => {
                    update({ stateLabel: text, stateUf: '', city: '' }, 'state', 'city');
                    touch('state');
                  }}
                  options={stateOptions}
                  onSelectOption={(option) => {
                    update({ stateUf: option.value, stateLabel: option.label, city: '' }, 'state', 'city');
                    touch('state');
                  }}
                  error={errorOf('state')}
                  disabled={isBlocked}
                />
                <TextField
                  type="Location"
                  label="Cidade"
                  placeholder={form.stateUf ? 'Selecione sua cidade' : 'Selecione o estado primeiro'}
                  value={form.city}
                  onChangeText={(text) => {
                    update({ city: text }, 'city');
                    touch('city');
                  }}
                  options={cityOptions}
                  onSelectOption={(option) => {
                    update({ city: option.label }, 'city');
                    touch('city');
                  }}
                  error={errorOf('city')}
                  disabled={isBlocked || !form.stateUf}
                />
              </>
            )}
          </View>

          <View style={styles.section}>
            <SectionHeader title="CONTA" variant="overline" />
            <TextField
              label="E-mail"
              placeholder="seuemail@exemplo.com"
              value={form.email}
              onChangeText={(text) => update({ email: text }, 'email')}
              onBlur={() => touch('email')}
              error={errorOf('email')}
              keyboardType="email-address"
              autoCapitalize="none"
              disabled={isBlocked}
            />
            <View style={styles.lockedField}>
              <TextField label={copy.documentLabel} value={document} disabled />
              <FieldHint text={copy.documentHint} />
            </View>
            <TextField
              type="Password"
              label="Nova senha"
              value={form.password}
              onChangeText={(text) => update({ password: text }, 'password')}
              onBlur={() => touch('password')}
              error={errorOf('password')}
              disabled={isBlocked}
            />
            <TextField
              type="Password"
              label="Confirmar nova senha"
              value={form.confirmPassword}
              onChangeText={(text) => update({ confirmPassword: text }, 'confirmPassword')}
              onBlur={() => touch('confirmPassword')}
              error={errorOf('confirmPassword')}
              disabled={isBlocked}
            />
            <Text style={styles.help}>Deixe em branco para manter a senha atual.</Text>
          </View>

          <InterestsSection
            userType={user.userType}
            tree={tagsTree.tags}
            isLoading={tagsTree.isLoading}
            loadError={tagsTree.error}
            onRetry={tagsTree.refetch}
            selection={selection}
            onChange={changeSelection}
            minimumAreas={minimumAreas}
            disabled={isBlocked}
            error={tagsApiError ?? selectionError}
          />

          <NotificationsSection />

          <Button
            label="Excluir conta"
            variant="DangerText"
            onPress={() => setIsDeleteOpen(true)}
            disabled={isBlocked}
            style={styles.deleteAccount}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      <FloatingSaveButton onPress={() => void handleSave()} disabled={!canSave} isLoading={isSaving} />

      <Dialog
        visible={isDiscardOpen}
        variant="DiscardChanges"
        cancelLabel="Continuar editando"
        onConfirm={() => {
          setIsDiscardOpen(false);
          leaveScreen();
        }}
        onCancel={() => setIsDiscardOpen(false)}
      />

      <Dialog
        visible={isDeleteOpen}
        variant="DeleteAccount"
        title={copy.deleteTitle}
        description={copy.deleteDescription}
        cancelLabel="Cancelar"
        isLoading={isDeleting}
        onConfirm={() => void handleDeleteAccount()}
        onCancel={() => setIsDeleteOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg.base,
  },
  flex: {
    flex: 1,
  },
  content: {
    padding: spacing[16],
    gap: spacing[24],
  },
  photo: {
    alignItems: 'center',
  },
  section: {
    gap: spacing[4],
  },
  // As listas de Estado/Cidade/Endereço abrem por cima da seção seguinte.
  sectionAboveDropdowns: {
    zIndex: 1,
  },
  lockedField: {
    gap: spacing[4],
    marginBottom: spacing[12],
  },
  help: {
    ...typography.bodyS,
    color: colors.text.tertiary,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[8],
    paddingLeft: spacing[16],
    paddingVertical: spacing[4],
    borderRadius: radius.md,
    backgroundColor: palette.error.bg,
  },
  bannerText: {
    ...typography.bodyM,
    flex: 1,
    color: colors.text.primary,
  },
  deleteAccount: {
    alignSelf: 'stretch',
  },
});
