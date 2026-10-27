import type { Role } from '@/types';

export interface OfficerNavItem {
  icon: string;
  labelKey: string;
  href: string;
}

/** Portal root for an officer role: ward and palika officers share the Palika portal. */
export function officerPortal(role?: Role): '/palika' | '/district' | '/province' {
  if (role === 'district_officer') return '/district';
  if (role === 'province_officer' || role === 'super_admin') return '/province';
  return '/palika';
}

/** Sidebar entries for an officer, matching the routes in App.tsx. */
export function officerNav(role?: Role): OfficerNavItem[] {
  const base = officerPortal(role);
  const items: OfficerNavItem[] = [
    { icon: 'dashboard', labelKey: 'dashboard', href: base },
    { icon: 'assignment', labelKey: 'complaints', href: `${base}/complaints` },
  ];
  if (base !== '/palika') items.push({ icon: 'warning', labelKey: 'escalations', href: `${base}/escalations` });
  items.push(
    { icon: 'map', labelKey: 'mapView', href: `${base}/map` },
    { icon: 'analytics', labelKey: 'analytics', href: `${base}/analytics` },
  );
  if (role !== 'ward_officer') items.push({ icon: 'group', labelKey: 'userDirectory', href: `${base}/users` });
  items.push(
    { icon: 'notifications', labelKey: 'alerts', href: `${base}/notifications` },
    { icon: 'person', labelKey: 'profile', href: `${base}/profile` },
  );
  return items;
}
