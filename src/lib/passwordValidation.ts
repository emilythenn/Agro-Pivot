export const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { key: "uppercase", label: "One uppercase letter (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { key: "lowercase", label: "One lowercase letter (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { key: "number", label: "One number (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { key: "special", label: "One special character (!@#$%...)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors = PASSWORD_RULES.filter(r => !r.test(password)).map(r => r.label);
  return { valid: errors.length === 0, errors };
}
