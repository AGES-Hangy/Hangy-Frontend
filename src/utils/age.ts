/** Idade completa em anos, na data de referência (padrão: agora). */
export function calculateAge(dateOfBirth: Date, reference: Date = new Date()): number {
  let age = reference.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = reference.getMonth() - dateOfBirth.getMonth();
  const dayDiff = reference.getDate() - dateOfBirth.getDate();

  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age -= 1;
  }

  return age;
}

export const MINIMUM_AGE = 18;

export function isAtLeast18(dateOfBirth: Date, reference?: Date): boolean {
  return calculateAge(dateOfBirth, reference) >= MINIMUM_AGE;
}
