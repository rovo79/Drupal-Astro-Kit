export type ReservedRoute = {
  path: string;
  source: string;
};

export const RESERVED_ROUTES: ReservedRoute[] = [
  { path: '/', source: 'src/pages/index.astro' },
  { path: '/apple-touch-icon.png', source: 'src/pages/apple-touch-icon.png.ts' },
  { path: '/apple-touch-icon-precomposed.png', source: 'src/pages/apple-touch-icon-precomposed.png.ts' },
];

export function findReservedAstroRoute(pathname: string): ReservedRoute | undefined {
  const normalized = normalizeRoutePath(pathname);
  return RESERVED_ROUTES.find((route) => route.path === normalized);
}

export function normalizeRoutePath(pathname: string): string {
  if (!pathname) {
    return '/';
  }

  const trimmed = pathname.trim();
  if (trimmed === '') {
    return '/';
  }

  const prefixed = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  if (prefixed.length > 1 && prefixed.endsWith('/')) {
    return prefixed.replace(/\/+$/, '');
  }

  return prefixed;
}
