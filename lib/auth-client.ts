export function usernameToEmail(username: string, domain?: string): string {
  const d = domain ?? process.env.NEXT_PUBLIC_AUTH_EMAIL_DOMAIN ?? "peumayen.local";
  return `${username.trim().toLowerCase()}@${d}`;
}
