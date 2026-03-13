import { getAppleTouchIconResponse } from '../lib/apple-touch-icon';

export const prerender = true;

export function GET() {
  return getAppleTouchIconResponse();
}
