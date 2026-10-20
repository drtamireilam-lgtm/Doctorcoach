// This allowlist is server configuration. Identity must come from the Sites
// dispatcher, never request JSON or caller-supplied headers on an untrusted host.
export type StaffIdentity = { userId: string; email: string };

export function isStaff(user: StaffIdentity | null, configuredEmails?: string): boolean {
  if (!user?.userId || !user.email || !configuredEmails) return false;
  const email = user.email.trim().toLowerCase();
  return configuredEmails.split(',').some(entry => entry.trim().toLowerCase() === email);
}
