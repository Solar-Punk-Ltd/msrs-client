import { Session } from './login';

export interface AuthSignature {
  message: string;
  signature: string;
  timestamp: number;
  nonce: string;
}

interface CookieOptions {
  expires?: Date;
  secure?: boolean;
  sameSite?: 'strict';
  path?: string;
  domain?: string;
}

const COOKIE_NAME = 'msrs_session';
const COOKIE_EXPIRY_24_HOUR = 24 * 60 * 60 * 1000;

export const setCookie = (session: Session, options: CookieOptions = {}): void => {
  const {
    expires = new Date(Date.now() + COOKIE_EXPIRY_24_HOUR),
    path = '/',
    domain,
    secure = true,
    sameSite = 'strict',
  } = options;

  const cookieData = JSON.stringify(session);

  let cookieString = `${encodeURIComponent(COOKIE_NAME)}=${encodeURIComponent(cookieData)}`;

  if (expires) {
    cookieString += `; expires=${expires.toUTCString()}`;
  }

  cookieString += `; path=${path}`;

  if (domain) {
    cookieString += `; domain=${domain}`;
  }

  if (secure) {
    cookieString += '; secure';
  }

  cookieString += `; samesite=${sameSite}`;

  document.cookie = cookieString;
};

const getCookie = (name: string): string | null => {
  const nameEQ = encodeURIComponent(name) + '=';
  const cookies = document.cookie.split(';');

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.indexOf(nameEQ) === 0) {
      return decodeURIComponent(cookie.substring(nameEQ.length));
    }
  }

  return null;
};

const deleteCookie = (name: string, path: string = '/'): void => {
  document.cookie = `${encodeURIComponent(
    name,
  )}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}; secure; samesite=strict`;
};

export const loadSessionFromCookie = (): Session | null => {
  const cookieValue = getCookie(COOKIE_NAME);

  if (!cookieValue) {
    return null;
  }

  try {
    const session = JSON.parse(cookieValue);

    return session;
  } catch (error) {
    console.error('Failed to parse session cookie:', error);
    deleteCookie(COOKIE_NAME);
    return null;
  }
};

export const clearSessionCookie = (): void => {
  deleteCookie(COOKIE_NAME);
};
