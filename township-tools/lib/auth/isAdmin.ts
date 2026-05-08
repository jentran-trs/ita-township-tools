export function isAdmin(authData: any): boolean {
  const orgRole = authData?.sessionClaims?.o?.rol;
  return orgRole === 'admin' || orgRole === 'org:admin';
}
