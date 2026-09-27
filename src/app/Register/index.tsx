import { useState } from 'react';
import { router } from 'expo-router';

import { useToast } from '@/components/Toast';
import { useRegister } from '@/hooks/useRegister';
import { useTags } from '@/hooks/useTags';
import { useTerms } from '@/hooks/useTerms';
import { useUserTags } from '@/hooks/useUserTags';
import { isAtLeast18 } from '@/utils/age';
import { onlyDigits } from '@/utils/documentValidation';
import { mapRegisterError, type RegisterErrorOutcome } from '@/utils/registerErrors';

import { RegisterScaffold } from '@/components/RegisterFlow/RegisterScaffold';
import {
  EMPTY_BUSINESS_FORM,
  EMPTY_PERSONAL_FORM,
  type BusinessFormState,
  type PersonalFormState,
  type RegisterFieldErrors,
} from '@/components/RegisterFlow/types';
import { PersonalStepOne } from '@/components/RegisterFlow/steps/PersonalStepOne';
import { PersonalStepTwo } from '@/components/RegisterFlow/steps/PersonalStepTwo';
import { BusinessStepOne } from '@/components/RegisterFlow/steps/BusinessStepOne';
import { BusinessStepTwo } from '@/components/RegisterFlow/steps/BusinessStepTwo';
import { TagsMacroStep } from '@/components/RegisterFlow/steps/TagsMacroStep';
import { TagsMicroStep } from '@/components/RegisterFlow/steps/TagsMicroStep';

type AccountType = 'pf' | 'pj';
type Phase = 'form' | 'tagsMacro' | 'tagsMicro';

/** Campos que só existem na etapa 1 — um erro do backend neles tem que voltar pra lá. */
const STEP_ONE_FIELDS = new Set(['email', 'cpf', 'cnpj', 'password']);

function toIsoDate(date: Date): string {
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function applyOutcomes(outcomes: RegisterErrorOutcome[], currentErrors: RegisterFieldErrors) {
  const errors: RegisterFieldErrors = { ...currentErrors };
  let generalError: string | null = null;
  let ageBlocked = false;
  let backToStepOne = false;

  for (const outcome of outcomes) {
    if (outcome.kind === 'field') {
      errors[outcome.field] = outcome.message;
      if (STEP_ONE_FIELDS.has(outcome.field)) backToStepOne = true;
    } else if (outcome.kind === 'general') {
      generalError = outcome.message;
    } else if (outcome.kind === 'ageBlocked') {
      ageBlocked = true;
    }
  }

  return { errors, generalError, ageBlocked, backToStepOne };
}

export default function Register() {
  const [accountType, setAccountType] = useState<AccountType>('pf');
  const [phase, setPhase] = useState<Phase>('form');
  const [pf, setPf] = useState<PersonalFormState>(EMPTY_PERSONAL_FORM);
  const [pj, setPj] = useState<BusinessFormState>(EMPTY_BUSINESS_FORM);
  const [selectedMacroIds, setSelectedMacroIds] = useState<string[]>([]);
  const [selectedMicroIds, setSelectedMicroIds] = useState<string[]>([]);
  const [tagsInlineError, setTagsInlineError] = useState<string | null>(null);

  const { register, isLoading: isRegistering, error: registerNetworkError } = useRegister();
  const { tags, isLoading: isLoadingTags, error: tagsError, refetch: refetchTags } = useTags();
  const { saveTags, isLoading: isSavingTags } = useUserTags();
  const { showWarningToast } = useToast();
  // Uma busca só, compartilhada pelas duas abas — ver `TermsBundle` em
  // `RegisterPieces.tsx`. `Register` é quem envia o cadastro, então é quem
  // precisa de `terms.version` pro `accepted_terms_version` do payload.
  const termsBundle = useTerms();

  function updatePf(patch: Partial<PersonalFormState>) {
    setPf((current) => ({ ...current, ...patch }));
  }

  function updatePj(patch: Partial<BusinessFormState>) {
    setPj((current) => ({ ...current, ...patch }));
  }

  async function handleSubmitPersonal() {
    // Validado no cliente antes de enviar (não gasta requisição), mas o
    // backend continua sendo a autoridade em caso de bypass — rede de
    // segurança, não caminho feliz.
    if (pf.dateOfBirth && !isAtLeast18(pf.dateOfBirth)) {
      router.replace('/Register/Blocked');
      return;
    }

    // O checkbox só habilita com `terms` carregado, mas se a busca falhar
    // bem no meio (refetch) entre marcar e enviar, não dá pra montar o
    // payload sem a versão aceita — mesma regra de "sem termos não há
    // aceite válido" do resto do fluxo.
    if (!termsBundle.terms) {
      updatePf({ generalError: 'Não foi possível carregar os termos. Tente de novo.' });
      return;
    }

    const result = await register({
      user_type: 'PERSONAL',
      email: pf.email.trim(),
      password: pf.password,
      name: pf.name.trim(),
      cpf: onlyDigits(pf.cpf),
      phone: onlyDigits(pf.phone),
      date_of_birth: pf.dateOfBirth ? toIsoDate(pf.dateOfBirth) : '',
      state: pf.stateUf,
      city: pf.city.trim(),
      accepted_terms_version: termsBundle.terms.version,
    });

    if (result === null) {
      updatePf({ generalError: registerNetworkError ?? 'Não foi possível conectar ao servidor.' });
      return;
    }

    if ('status' in result) {
      const outcomes = mapRegisterError(result.status, result.body);
      const { errors, generalError, ageBlocked, backToStepOne } = applyOutcomes(outcomes, pf.errors);
      if (ageBlocked) {
        router.replace('/Register/Blocked');
        return;
      }
      updatePf({ errors, generalError, step: backToStepOne ? 1 : pf.step });
      return;
    }

    setPhase('tagsMacro');
  }

  async function handleSubmitBusiness() {
    if (!termsBundle.terms) {
      updatePj({ generalError: 'Não foi possível carregar os termos. Tente de novo.' });
      return;
    }

    const result = await register({
      user_type: 'BUSINESS',
      email: pj.email.trim(),
      password: pj.password,
      business_name: pj.businessName.trim(),
      cnpj: onlyDigits(pj.cnpj),
      phone: onlyDigits(pj.phone),
      address: pj.address.trim(),
      ...(pj.addressLatitude !== null && pj.addressLongitude !== null
        ? { latitude: pj.addressLatitude, longitude: pj.addressLongitude }
        : null),
      instagram: pj.instagram.trim(),
      accepted_terms_version: termsBundle.terms.version,
    });

    if (result === null) {
      updatePj({ generalError: registerNetworkError ?? 'Não foi possível conectar ao servidor.' });
      return;
    }

    if ('status' in result) {
      const outcomes = mapRegisterError(result.status, result.body);
      const { errors, generalError, backToStepOne } = applyOutcomes(outcomes, pj.errors);
      updatePj({ errors, generalError, step: backToStepOne ? 1 : pj.step });
      return;
    }

    router.replace('/HomeComercial');
  }

  function toggleMacro(id: string) {
    setSelectedMacroIds((current) =>
      current.includes(id) ? current.filter((macroId) => macroId !== id) : [...current, id],
    );
  }

  function toggleMicro(id: string) {
    setTagsInlineError(null);
    setSelectedMicroIds((current) =>
      current.includes(id) ? current.filter((microId) => microId !== id) : [...current, id],
    );
  }

  async function handleSubmitTags() {
    setTagsInlineError(null);
    const outcome = await saveTags(selectedMicroIds);

    if (outcome === null) {
      router.replace('/Feed');
      return;
    }

    if (outcome.kind === 'inline') {
      setTagsInlineError(outcome.message);
      return;
    }

    if (outcome.reloadTags) void refetchTags();
    showWarningToast(outcome.message);
  }

  if (phase === 'tagsMacro') {
    return (
      <RegisterScaffold variant="compact">
        <TagsMacroStep
          tags={tags}
          isLoading={isLoadingTags}
          error={tagsError}
          selectedMacroIds={selectedMacroIds}
          onToggleMacro={toggleMacro}
          onContinue={() => setPhase('tagsMicro')}
        />
      </RegisterScaffold>
    );
  }

  if (phase === 'tagsMicro') {
    return (
      <RegisterScaffold variant="compact">
        <TagsMicroStep
          tags={tags}
          selectedMacroIds={selectedMacroIds}
          selectedMicroIds={selectedMicroIds}
          onToggleMicro={toggleMicro}
          onSubmit={handleSubmitTags}
          isSubmitting={isSavingTags}
          inlineError={tagsInlineError}
        />
      </RegisterScaffold>
    );
  }

  return (
    <RegisterScaffold variant="form">
      {accountType === 'pf' ? (
        pf.step === 1 ? (
          <PersonalStepOne
            form={pf}
            onChange={updatePf}
            onSwitchToBusiness={() => setAccountType('pj')}
            onNext={() => updatePf({ step: 2 })}
          />
        ) : (
          <PersonalStepTwo
            form={pf}
            onChange={updatePf}
            onSubmit={handleSubmitPersonal}
            isSubmitting={isRegistering}
            termsBundle={termsBundle}
          />
        )
      ) : pj.step === 1 ? (
        <BusinessStepOne
          form={pj}
          onChange={updatePj}
          onSwitchToPersonal={() => setAccountType('pf')}
          onNext={() => updatePj({ step: 2 })}
        />
      ) : (
        <BusinessStepTwo
          form={pj}
          onChange={updatePj}
          onSubmit={handleSubmitBusiness}
          isSubmitting={isRegistering}
          termsBundle={termsBundle}
        />
      )}
    </RegisterScaffold>
  );
}
