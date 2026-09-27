/**
 * CPF/CNPJ/telefone não têm biblioteca no projeto (nenhuma dependência de
 * máscara instalada) — dígito verificador e máscara ficam aqui, funções puras,
 * sem classe, no mesmo espírito de `datetime.ts`.
 */

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

/** `12345678900` -> `123.456.789-00`, aplicando a máscara conforme digita. */
export function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d{1,2})$/, '.$1-$2');
}

/** `12345678000199` -> `12.345.678/0001-99`. */
export function maskCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

/** `51999999999` -> `(51) 99999-9999` (aceita fixo de 10 dígitos também). */
export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

/** Garante um único `@` no início do handle, sem forçar um quando o campo está vazio. */
export function maskInstagramHandle(value: string): string {
  const trimmed = value.trimStart();
  if (trimmed.length === 0) return trimmed;
  return `@${trimmed.replace(/^@+/, '')}`;
}

function hasAllSameDigits(digits: string): boolean {
  return digits.split('').every((digit) => digit === digits[0]);
}

function calculateCheckDigit(digits: string, weights: number[]): number {
  const sum = digits
    .split('')
    .reduce((total, digit, index) => total + Number(digit) * weights[index], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

/** Algoritmo padrão de dígito verificador da Receita Federal. */
export function isValidCpf(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || hasAllSameDigits(digits)) return false;

  const firstCheckDigit = calculateCheckDigit(digits.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const secondCheckDigit = calculateCheckDigit(
    digits.slice(0, 9) + firstCheckDigit,
    [11, 10, 9, 8, 7, 6, 5, 4, 3, 2],
  );

  return digits === digits.slice(0, 9) + firstCheckDigit + secondCheckDigit;
}

/** Algoritmo padrão de dígito verificador da Receita Federal. */
export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || hasAllSameDigits(digits)) return false;

  const firstWeights = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const secondWeights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const firstCheckDigit = calculateCheckDigit(digits.slice(0, 12), firstWeights);
  const secondCheckDigit = calculateCheckDigit(digits.slice(0, 12) + firstCheckDigit, secondWeights);

  return digits === digits.slice(0, 12) + firstCheckDigit + secondCheckDigit;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
