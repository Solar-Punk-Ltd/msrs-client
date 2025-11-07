import { Session } from '../auth/login';

export interface AuthSignature {
  message: string;
  signature: string;
  timestamp: number;
  nonce: string;
}

export enum StorageMethod {
  COOKIE = 'cookie',
  LOCAL_STORAGE = 'localStorage',
}

interface StorageOptions {
  method?: StorageMethod;
  cookieExpiry?: number; // milliseconds
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
  path?: string;
  domain?: string;
}

const STORAGE_NAME = 'msrs_session';
const DEFAULT_EXPIRY_24_HOURS = 24 * 60 * 60 * 1000;

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

const setCookie = (name: string, value: string, options: Omit<StorageOptions, 'method'> = {}): void => {
  const { cookieExpiry = DEFAULT_EXPIRY_24_HOURS, path = '/', domain, secure = true, sameSite = 'strict' } = options;

  const expires = new Date(Date.now() + cookieExpiry);

  let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
  cookieString += `; expires=${expires.toUTCString()}`;
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

const deleteCookie = (name: string, path: string = '/'): void => {
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
};

export const persistUserSession = (session: Session, options: StorageOptions = {}): boolean => {
  const data = JSON.stringify(session);

  try {
    if (options.method === StorageMethod.COOKIE) {
      setCookie(STORAGE_NAME, data, options);
      return getCookie(STORAGE_NAME) !== null;
    }

    if (options.method === StorageMethod.LOCAL_STORAGE) {
      localStorage.setItem(STORAGE_NAME, data);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Failed to save session to ${options.method}:`, error);
    return false;
  }
};

export const restoreUserSession = (method: StorageMethod): Session | null => {
  try {
    let data: string | null = null;

    if (method === StorageMethod.COOKIE) {
      data = getCookie(STORAGE_NAME);
    }

    if (method === StorageMethod.LOCAL_STORAGE) {
      data = localStorage.getItem(STORAGE_NAME);
    }

    if (!data) return null;

    return JSON.parse(data);
  } catch (error) {
    console.error(`Failed to load session from ${method}:`, error);
    purgeUserSession(method);
    return null;
  }
};

export const purgeUserSession = (method: StorageMethod): void => {
  try {
    if (method === StorageMethod.COOKIE) {
      deleteCookie(STORAGE_NAME);
    }
    if (method === StorageMethod.LOCAL_STORAGE) {
      localStorage.removeItem(STORAGE_NAME);
    }
  } catch (error) {
    console.error(`Failed to clear session from ${method}:`, error);
  }
};

export const hasPersistedUserSession = (method: StorageMethod): boolean => {
  if (method === StorageMethod.COOKIE) {
    return getCookie(STORAGE_NAME) !== null;
  }
  if (method === StorageMethod.LOCAL_STORAGE) {
    return localStorage.getItem(STORAGE_NAME) !== null;
  }

  return false;
};

export const ADMIN_CONFIGS_STORAGE_NAME = 'admin_configs';

export const persistAdminConfigs = (configs: any[]): boolean => {
  try {
    const data = JSON.stringify(configs);
    localStorage.setItem(ADMIN_CONFIGS_STORAGE_NAME, data);
    return true;
  } catch (error) {
    console.error('Failed to save admin configs to localStorage:', error);
    return false;
  }
};

export const restoreAdminConfigs = (): any[] | null => {
  try {
    const data = localStorage.getItem(ADMIN_CONFIGS_STORAGE_NAME);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load admin configs from localStorage:', error);
    return null;
  }
};

export const purgeAdminConfigs = (): void => {
  try {
    localStorage.removeItem(ADMIN_CONFIGS_STORAGE_NAME);
  } catch (error) {
    console.error('Failed to clear admin configs from localStorage:', error);
  }
};
