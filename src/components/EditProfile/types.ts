import type { CurrentUser } from '@/hooks/useCurrentUser';
import type { TagNode } from '@/hooks/useTags';
import type { UserType } from '@/types/event';
import type {
  BusinessProfile,
  BusinessProfilePatch,
  PersonalProfile,
  PersonalProfilePatch,
  UserTag,
} from '@/types/profile';
import { isAtLeast18 } from '@/utils/age';
import { isValidEmail, maskInstagramHandle, maskPhone, onlyDigits } from '@/utils/documentValidation';
import type { EditProfileFieldErrors } from '@/utils/profileErrors';

/**
 * Limite da bio. ⚠️ Pendência da task 072: o Figma mostra `/1000`, mas o
 * backend hoje recusa descrição acima de 500. Fica o limite que o backend
 * aceita até o alinhamento; contador, validação e erro leem daqui.
 */
export const BIO_MAX_LENGTH = 500;

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128;

/** Mínimo de áreas por tipo de conta — o mesmo do cadastro (`TagsMacroStep`). */
export const MINIMUM_AREAS: Record<UserType, number> = { PERSONAL: 3, BUSINESS: 1 };

/** Um formulário só para as duas variantes; cada uma usa os campos que desenha. */
export type EditProfileFormState = {
  name: string;
  bio: string;
  phone: string;
  /** Só pessoa física. */
  dateOfBirth: Date | null;
  /** Só estabelecimento. */
  instagram: string;
  /** Só pessoa física. `stateLabel` é o texto do campo; `stateUf` só existe com uma opção escolhida. */
  stateUf: string;
  stateLabel: string;
  city: string;
  /** Só estabelecimento. As coordenadas só existem com um endereço escolhido da lista ou do mapa. */
  address: string;
  latitude: number | null;
  longitude: number | null;
  email: string;
  /** Em branco = manter a senha atual. */
  password: string;
  confirmPassword: string;
};

export type TagSelection = { macroIds: string[]; microIds: string[] };

function parseIsoDate(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function toIsoDate(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function buildInitialForm(
  user: CurrentUser,
  profile: PersonalProfile | BusinessProfile,
): EditProfileFormState {
  const personal = profile as PersonalProfile;
  const business = profile as BusinessProfile;
  const isBusiness = user.userType === 'BUSINESS';

  return {
    name: (isBusiness ? business.business_name : personal.name) ?? '',
    bio: profile.description ?? '',
    phone: maskPhone(profile.phone ?? ''),
    dateOfBirth: isBusiness ? null : parseIsoDate(personal.date_of_birth),
    instagram: isBusiness ? maskInstagramHandle(business.instagram ?? '') : '',
    stateUf: isBusiness ? '' : personal.state ?? '',
    // Trocado pelo nome do estado quando a lista do IBGE carrega.
    stateLabel: isBusiness ? '' : personal.state ?? '',
    city: isBusiness ? '' : personal.city ?? '',
    address: isBusiness ? business.address ?? '' : '',
    latitude: isBusiness ? business.location?.latitude ?? null : null,
    longitude: isBusiness ? business.location?.longitude ?? null : null,
    email: profile.email ?? user.email,
    password: '',
    confirmPassword: '',
  };
}

/**
 * `PATCH` só com o que mudou em relação ao que a tela carregou. Um objeto
 * vazio significa "nada a salvar" — é também o teste de formulário alterado.
 */
export function buildProfilePatch(
  userType: UserType,
  form: EditProfileFormState,
  initial: EditProfileFormState,
): PersonalProfilePatch | BusinessProfilePatch {
  const shared: PersonalProfilePatch & BusinessProfilePatch = {};

  if (form.bio.trim() !== initial.bio.trim()) shared.description = form.bio.trim();
  if (onlyDigits(form.phone) !== onlyDigits(initial.phone)) shared.phone = onlyDigits(form.phone);
  if (form.email.trim() !== initial.email.trim()) shared.email = form.email.trim();
  if (form.password.length > 0) shared.password = form.password;

  if (userType === 'BUSINESS') {
    const patch: BusinessProfilePatch = { ...shared };
    if (form.name.trim() !== initial.name.trim()) patch.business_name = form.name.trim();
    if (form.instagram.trim() !== initial.instagram.trim()) patch.instagram = form.instagram.trim();

    const addressChanged =
      form.address.trim() !== initial.address.trim() ||
      form.latitude !== initial.latitude ||
      form.longitude !== initial.longitude;
    if (addressChanged) {
      patch.address = form.address.trim();
      // Endereço e coordenadas andam juntos; sem coordenadas a validação já barra o envio.
      if (form.latitude !== null && form.longitude !== null) {
        patch.location = { latitude: form.latitude, longitude: form.longitude };
      }
    }
    return patch;
  }

  const patch: PersonalProfilePatch = { ...shared };
  if (form.name.trim() !== initial.name.trim()) patch.name = form.name.trim();
  if (form.dateOfBirth?.getTime() !== initial.dateOfBirth?.getTime() && form.dateOfBirth) {
    patch.date_of_birth = toIsoDate(form.dateOfBirth);
  }
  // Compara a UF, e não o rótulo: o rótulo muda sozinho quando a lista do
  // IBGE carrega e troca "RS" por "Rio Grande do Sul".
  if (form.stateUf !== initial.stateUf) patch.state = form.stateUf;
  if (form.city.trim() !== initial.city.trim()) patch.city = form.city.trim();
  return patch;
}

const INSTAGRAM_HANDLE = /^@[A-Za-z0-9._]{1,30}$/;

/**
 * Validação por campo. "Obrigatório" só vale para o campo que o usuário
 * mexeu: a tela pode abrir com um campo vazio (leitura do perfil ainda sem
 * rota no backend) e isso não pode travar a edição dos demais.
 */
export function validateForm(
  userType: UserType,
  form: EditProfileFormState,
  initial: EditProfileFormState,
): EditProfileFieldErrors {
  const errors: EditProfileFieldErrors = {};
  const isBusiness = userType === 'BUSINESS';

  if (form.name.trim().length === 0 && initial.name.trim().length > 0) {
    errors.name = isBusiness ? 'Informe o nome fantasia.' : 'Informe o seu nome.';
  }

  if (form.bio.length > BIO_MAX_LENGTH) errors.bio = 'Bio muito longa';

  const phoneDigits = onlyDigits(form.phone);
  const phoneChanged = phoneDigits !== onlyDigits(initial.phone);
  if (phoneChanged && phoneDigits.length !== 10 && phoneDigits.length !== 11) {
    errors.phone = 'Digite um telefone válido, com DDD.';
  }

  if (!isValidEmail(form.email)) errors.email = 'Digite um e-mail válido.';

  if (form.password.length > 0 || form.confirmPassword.length > 0) {
    if (form.password.length < PASSWORD_MIN_LENGTH || form.password.length > PASSWORD_MAX_LENGTH) {
      errors.password = `Use entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres.`;
    }
    if (form.confirmPassword !== form.password) errors.confirmPassword = 'As senhas não conferem.';
  }

  if (isBusiness) {
    if (form.instagram.trim().length > 0 && !INSTAGRAM_HANDLE.test(form.instagram.trim())) {
      errors.instagram = 'Use o formato @usuario, só com letras, números, ponto e sublinhado.';
    }

    const addressChanged =
      form.address.trim() !== initial.address.trim() ||
      form.latitude !== initial.latitude ||
      form.longitude !== initial.longitude;
    if (addressChanged && (form.address.trim().length === 0 || form.latitude === null || form.longitude === null)) {
      errors.address = 'Selecione um endereço da lista ou do mapa.';
    }
  } else {
    if (form.dateOfBirth && !isAtLeast18(form.dateOfBirth)) {
      errors.dateOfBirth = 'É preciso ter 18 anos ou mais para usar o Hangy.';
    }

    const locationChanged = form.stateUf !== initial.stateUf || form.city.trim() !== initial.city.trim();
    if (locationChanged) {
      if (form.stateUf.length === 0) errors.state = 'Selecione um estado da lista.';
      if (form.city.trim().length === 0) errors.city = 'Selecione uma cidade.';
    }
  }

  return errors;
}

/** Seleção salva (`GET /users/me/tags`) no formato que a tela edita. */
export function buildInitialSelection(userTags: UserTag[], tree: TagNode[]): TagSelection {
  if (tree.length === 0) {
    // Árvore indisponível: confia no `parent` que veio junto de cada tag.
    const micros = userTags.filter((tag) => tag.parent !== null);
    return {
      microIds: micros.map((tag) => tag.id),
      macroIds: [...new Set(micros.map((tag) => tag.parent!.id))],
    };
  }

  const saved = new Set(userTags.map((tag) => tag.id));
  const microIds: string[] = [];
  const macroIds: string[] = [];

  for (const macro of tree) {
    const selected = macro.children.filter((leaf) => saved.has(leaf.id));
    if (selected.length === 0) continue;
    macroIds.push(macro.id);
    microIds.push(...selected.map((leaf) => leaf.id));
  }

  return { macroIds, microIds };
}

export function isSameSelection(first: TagSelection, second: TagSelection): boolean {
  const sameIds = (a: string[], b: string[]) => a.length === b.length && a.every((id) => b.includes(id));
  return sameIds(first.macroIds, second.macroIds) && sameIds(first.microIds, second.microIds);
}

/**
 * `null` quando a seleção pode ser salva. O `PUT /users/me/tags` só aceita
 * micro, então uma área sem nenhuma micro sumiria ao salvar — a tela avisa em
 * vez de perder a área em silêncio.
 */
export function validateSelection(
  selection: TagSelection,
  tree: TagNode[],
  minimumAreas: number,
): string | null {
  if (selection.macroIds.length < minimumAreas) {
    return minimumAreas === 1
      ? 'Escolha pelo menos 1 área.'
      : `Escolha pelo menos ${minimumAreas} áreas.`;
  }

  const emptyArea = tree.find(
    (macro) =>
      selection.macroIds.includes(macro.id) &&
      !macro.children.some((leaf) => selection.microIds.includes(leaf.id)),
  );
  if (emptyArea) return `Escolha pelo menos um interesse em ${emptyArea.name}.`;

  return null;
}

/** `12345678900` -> `•••.•••.•••-00`: o documento aparece, mas não inteiro. */
export function maskDocument(userType: UserType, document: string | null | undefined): string {
  const digits = onlyDigits(document ?? '');
  const hidden = '•';

  if (userType === 'BUSINESS') {
    const tail = digits.length === 14 ? digits.slice(-2) : hidden.repeat(2);
    return `${hidden.repeat(2)}.${hidden.repeat(3)}.${hidden.repeat(3)}/${hidden.repeat(4)}-${tail}`;
  }

  const tail = digits.length === 11 ? digits.slice(-2) : hidden.repeat(2);
  return `${hidden.repeat(3)}.${hidden.repeat(3)}.${hidden.repeat(3)}-${tail}`;
}
