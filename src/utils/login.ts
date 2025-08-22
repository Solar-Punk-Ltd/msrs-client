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

export interface Session {
  adminId: string;
  instanceId: string;
  username: string;
  publicKey: string;
  privateKey: string;
  loginTime: number;
  expiresAt: number;
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
      loginTime: Date.now(),
      expiresAt: Date.now() + 60 * 60 * 1000,
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
    loginTime: Date.now(),
    expiresAt: Date.now() + 60 * 60 * 1000,
    publicKey: pubKey,
    privateKey: privKey,
  };

  return {
    session,
  };
};
