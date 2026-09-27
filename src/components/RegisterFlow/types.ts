import type { RegisterFormField } from '@/utils/registerErrors';

export type RegisterFieldErrors = Partial<Record<RegisterFormField, string>>;

export type PersonalFormState = {
  step: 1 | 2;
  email: string;
  cpf: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  dateOfBirth: Date | null;
  stateUf: string;
  stateLabel: string;
  city: string;
  termsAccepted: boolean;
  errors: RegisterFieldErrors;
  generalError: string | null;
};

export type BusinessFormState = {
  step: 1 | 2;
  email: string;
  cnpj: string;
  password: string;
  confirmPassword: string;
  businessName: string;
  phone: string;
  address: string;
  addressLatitude: number | null;
  addressLongitude: number | null;
  instagram: string;
  termsAccepted: boolean;
  errors: RegisterFieldErrors;
  generalError: string | null;
};

export const EMPTY_PERSONAL_FORM: PersonalFormState = {
  step: 1,
  email: '',
  cpf: '',
  password: '',
  confirmPassword: '',
  name: '',
  phone: '',
  dateOfBirth: null,
  stateUf: '',
  stateLabel: '',
  city: '',
  termsAccepted: false,
  errors: {},
  generalError: null,
};

export const EMPTY_BUSINESS_FORM: BusinessFormState = {
  step: 1,
  email: '',
  cnpj: '',
  password: '',
  confirmPassword: '',
  businessName: '',
  phone: '',
  address: '',
  addressLatitude: null,
  addressLongitude: null,
  instagram: '',
  termsAccepted: false,
  errors: {},
  generalError: null,
};
