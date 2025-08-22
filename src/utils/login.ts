import CryptoJS from 'crypto-js';

import { config } from './config';

export interface InstanceConfig {
  adminCredentialRef: string;
}

interface CredentialBundle {
  checksum?: string;
  encrypted: string;
  salt: string;
  iv: string;
}

interface TokenData {
  secret: string;
  instanceId: string;
  adminId: string;
  username: string;
  nonce: string;
  signature: string;
}

export interface AdminSession {
  adminId: string;
  username: string;
  instanceId: string;
  loginTime: number;
  expiresAt: number;
}

export interface LoginResult {
  success: boolean;
  session?: AdminSession;
  error?: string;
}

interface DecryptedData {
  token: string;
}

const createPasswordChecksum = (password: string): string => {
  return CryptoJS.SHA256(password + 'checksum-salt')
    .toString()
    .substring(0, 8);
};

const createHmac = (secret: string, data: Record<string, string>): string => {
  return CryptoJS.HmacSHA256(JSON.stringify(data), secret).toString();
};

const decryptWithPassword = async (encryptedBundle: CredentialBundle, password: string): Promise<DecryptedData> => {
  // Derive key from password
  const key = CryptoJS.PBKDF2(password, CryptoJS.enc.Base64.parse(encryptedBundle.salt), {
    keySize: 256 / 32,
    iterations: 100000,
  });

  const decrypted = CryptoJS.AES.decrypt(encryptedBundle.encrypted, key, {
    iv: CryptoJS.enc.Base64.parse(encryptedBundle.iv),
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7,
  });

  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
};

const downloadDataFromSwarm = async (swarmHash: string): Promise<CredentialBundle> => {
  const response = await fetch(`${config.readerBeeUrl}/bytes/${swarmHash}`);
  if (!response.ok) {
    throw new Error(`Failed to download data from Swarm: ${response.statusText}`);
  }
  return response.json();
};

export const login = async (instanceConfig: InstanceConfig, password: string): Promise<LoginResult> => {
  try {
    const swarmHash = instanceConfig.adminCredentialRef;

    const credentialBundle = await downloadDataFromSwarm(swarmHash);

    const checksum = createPasswordChecksum(password);
    if (credentialBundle.checksum && credentialBundle.checksum !== checksum) {
      throw new Error('Invalid password');
    }

    const decrypted = await decryptWithPassword(credentialBundle, password);

    const tokenData: TokenData = JSON.parse(atob(decrypted.token));

    const expectedSignature = createHmac(tokenData.secret, {
      instanceId: tokenData.instanceId,
      adminId: tokenData.adminId,
      nonce: tokenData.nonce,
    });

    if (tokenData.signature !== expectedSignature) {
      throw new Error('Invalid credentials');
    }

    const session: AdminSession = {
      adminId: tokenData.adminId,
      username: tokenData.username,
      instanceId: tokenData.instanceId,
      loginTime: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000,
    };

    sessionStorage.setItem('adminSession', JSON.stringify(session));

    return {
      success: true,
      session,
    };
  } catch (error) {
    console.error('Login failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const isLoggedIn = (): boolean => {
  const session = sessionStorage.getItem('adminSession');
  if (!session) return false;

  try {
    const sessionData: AdminSession = JSON.parse(session);
    if (Date.now() > sessionData.expiresAt) {
      sessionStorage.removeItem('adminSession');
      return false;
    }
    return true;
  } catch {
    sessionStorage.removeItem('adminSession');
    return false;
  }
};

export const logout = (): void => {
  sessionStorage.removeItem('adminSession');
};

export const getCurrentSession = (): AdminSession | null => {
  const session = sessionStorage.getItem('adminSession');
  if (!session) return null;

  try {
    const sessionData: AdminSession = JSON.parse(session);
    if (Date.now() > sessionData.expiresAt) {
      sessionStorage.removeItem('adminSession');
      return null;
    }
    return sessionData;
  } catch {
    sessionStorage.removeItem('adminSession');
    return null;
  }
};
