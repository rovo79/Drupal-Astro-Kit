import { Buffer } from 'node:buffer';

const APPLE_TOUCH_ICON_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a+5EAAAAASUVORK5CYII=';

const APPLE_TOUCH_ICON_HEADERS = {
  'Content-Type': 'image/png',
  'Cache-Control': 'public, max-age=86400',
};

export function getAppleTouchIconResponse() {
  return new Response(Buffer.from(APPLE_TOUCH_ICON_BASE64, 'base64'), {
    headers: APPLE_TOUCH_ICON_HEADERS,
  });
}
