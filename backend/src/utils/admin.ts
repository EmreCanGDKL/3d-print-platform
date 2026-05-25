export function isAdminEmail(email: string) {
  const adminEmails = (process.env.ADMIN_EMAILS || process.env.ADMIN_EMAIL || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return adminEmails.includes(email.trim().toLowerCase());
}

export function getEffectiveRole(user: { email: string; role: string }) {
  return user.role === 'ADMIN' || isAdminEmail(user.email) ? 'ADMIN' : user.role;
}

export function isAdminUser(user: { email: string; role: string }) {
  return getEffectiveRole(user) === 'ADMIN';
}
