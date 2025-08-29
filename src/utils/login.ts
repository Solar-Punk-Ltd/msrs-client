import CryptoJS from 'crypto-js';

import { config } from './config';
import { getSigner } from './wallet';

export interface InstanceConfig {
  adminCredentialRef: string;
}

export interface AdminConfig {
  instanceId: string;
  adminCredentialRef: string;
  createdAt: number;
}

interface CredentialBundle {
  instanceId: string;
  checksum?: string;
  encrypted: {
    encrypted: string;
    salt: string;
    iv: string;
    authTag: string;
  };
  createdAt: number;
}

interface TokenData {
  secret: string;
  instanceId: string;
  adminId: string;
  username: string;
  nonce: string;
  signature: string;
}

export interface Session {
  adminId: string;
  instanceId: string;
  username: string;
  publicKey: string;
  privateKey: string;
}

export interface LoginResult {
  session?: Session;
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

const decryptWithPassword = async (encryptedBundle: any, password: string): Promise<DecryptedData> => {
  try {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
      'deriveBits',
      'deriveKey',
    ]);

    // Derive the same key using the same parameters as msrs auth script
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: Uint8Array.from(atob(encryptedBundle.salt), (c) => c.charCodeAt(0)),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    );

    const encryptedBytes = Uint8Array.from(atob(encryptedBundle.encrypted), (c) => c.charCodeAt(0));
    const authTag = Uint8Array.from(atob(encryptedBundle.authTag), (c) => c.charCodeAt(0));

    // GCM expects the auth tag to be appended to the encrypted data
    const combined = new Uint8Array(encryptedBytes.length + authTag.length);
    combined.set(encryptedBytes);
    combined.set(authTag, encryptedBytes.length);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: Uint8Array.from(atob(encryptedBundle.iv), (c) => c.charCodeAt(0)),
      },
      key,
      combined,
    );

    const decoder = new TextDecoder();
    const decryptedStr = decoder.decode(decrypted);

    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt credentials - invalid password or corrupted data');
  }
};

const downloadDataFromSwarm = async (swarmHash: string): Promise<CredentialBundle> => {
  const response = await fetch(`${config.readerBeeUrl}/bytes/${swarmHash}`);
  if (!response.ok) {
    throw new Error(`Failed to download data from Swarm: ${response.statusText}`);
  }
  return response.json();
};

export const getAdminConfigs = async (): Promise<AdminConfig[]> => {
  try {
    const adminConfigs = await import('../configs/instance-admins.json');
    return adminConfigs.default || adminConfigs;
  } catch (error) {
    console.error('Failed to load admin configs:', error);
    return [];
  }
};

export const findAdminByUsername = async (username: string): Promise<AdminConfig | null> => {
  const adminConfigs = await getAdminConfigs();
  const adminConfig = adminConfigs.find((config) => config.instanceId === username);
  return adminConfig || null;
};

export const adminlogin = async (username: string, password: string): Promise<LoginResult> => {
  try {
    const adminConfig = await findAdminByUsername(username);
    if (!adminConfig) {
      throw new Error('Admin not found');
    }

    const swarmHash = adminConfig.adminCredentialRef;

    const credentialBundle = await downloadDataFromSwarm(swarmHash);

    const encryptedData = credentialBundle.encrypted;

    if (
      !credentialBundle ||
      !encryptedData ||
      !encryptedData.encrypted ||
      !encryptedData.salt ||
      !encryptedData.iv ||
      !encryptedData.authTag
    ) {
      throw new Error('Invalid credential data structure');
    }

    // quick check
    if (credentialBundle.checksum) {
      const checksum = createPasswordChecksum(password);
      if (credentialBundle.checksum !== checksum) {
        throw new Error('Invalid password');
      }
    }

    const decrypted = await decryptWithPassword(encryptedData, password);

    if (!decrypted || !decrypted.token) {
      throw new Error('Invalid decrypted data structure');
    }

    const tokenData: TokenData = JSON.parse(atob(decrypted.token));

    const expectedSignature = createHmac(tokenData.secret, {
      instanceId: tokenData.instanceId,
      adminId: tokenData.adminId,
      nonce: tokenData.nonce,
    });

    if (tokenData.signature !== expectedSignature) {
      throw new Error('Invalid credentials');
    }

    const signer = getSigner(tokenData.secret);
    if (!signer) {
      throw new Error('Invalid secret');
    }

    const privKey = signer.toHex();
    const pubKey = signer.publicKey().address().toHex();

    const session: Session = {
      adminId: tokenData.adminId,
      username: tokenData.username,
      instanceId: tokenData.instanceId,
      publicKey: pubKey,
      privateKey: privKey,
    };

    return {
      session,
    };
  } catch (error) {
    console.error('Login failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const nicknameLogin = async (nickname: string): Promise<LoginResult> => {
  const signer = getSigner(nickname);
  if (!signer) {
    return { error: 'Invalid nickname' };
  }

  const privKey = signer.toHex();
  const pubKey = signer.publicKey().address().toHex();

  const session: Session = {
    adminId: '',
    username: nickname,
    instanceId: '',
    publicKey: pubKey,
    privateKey: privKey,
  };

  return {
    session,
  };
};
