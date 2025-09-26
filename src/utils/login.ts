import bs58 from 'bs58';
import CryptoJS from 'crypto-js';
import msgpack from 'msgpack-lite';
import { deflate } from 'pako';

import { MsrsIngMessage, StreamAggMessage } from '@/types/stream';

import { config } from './config';
import { getSigner } from './wallet';

const messagepackEncode = msgpack.encode;

export interface InstanceConfig {
  swarmRef: string;
}

export interface AdminConfig {
  instanceId: string;
  swarmRef: string;
  createdAt: number;
}

interface CredentialBundle {
  instanceId: string;
  checksum: string;
  encrypted: {
    encrypted: string;
    salt: string;
    iv: string;
    authTag: string;
  };
  createdAt: number;
}

interface UserCredentials {
  instanceId: string;
  userId: string;
  userSecret: string;
  serverKeys: {
    nginx: string;
    msrsIngestion: string;
    streamAggregator: string;
  };
  username: string;
  createdAt: number;
}

export interface Session extends UserCredentials {}

export interface LoginResult {
  session?: Session;
  error?: string;
}

type ServerType = 'msrsIngestion' | 'streamAggregator';

export class TokenGenerator {
  private credentials: UserCredentials;

  constructor(credentials: UserCredentials) {
    this.credentials = credentials;
  }

  public async generateServerToken(
    serverType: ServerType,
    messageData: object,
    expirationHours: number = 24,
  ): Promise<string> {
    const serverKey = this.credentials.serverKeys[serverType];
    if (!serverKey) {
      throw new Error(`No server key found for ${serverType}`);
    }

    const createdAt = Date.now();
    const expiresAt = createdAt + expirationHours * 60 * 60 * 1000;

    const payload = {
      u: this.credentials.userId,
      s: this.credentials.userSecret,
      message: messageData,
    };

    const packedPayload = messagepackEncode(payload);
    const compressedPayload = deflate(packedPayload);

    const encryptedPayload = await this.encryptForServer(compressedPayload, serverKey);

    const dataToSign = {
      i: this.credentials.instanceId,
      p: encryptedPayload,
      c: createdAt,
      e: expiresAt,
    };

    const signatureBuffer = messagepackEncode(dataToSign);
    const hexString = Array.from(signatureBuffer)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const signature = CryptoJS.HmacSHA256(CryptoJS.enc.Hex.parse(hexString), this.credentials.userSecret).toString();

    const finalTokenData = {
      s: signature,
      ...dataToSign,
    };

    const tokenBuffer = messagepackEncode(finalTokenData);
    return bs58.encode(Buffer.from(tokenBuffer));
  }

  private async encryptForServer(
    payload: Uint8Array,
    serverKey: string,
  ): Promise<{ encrypted: string; iv: string; authTag: string }> {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(serverKey);
    const keyHash = await crypto.subtle.digest('SHA-256', keyData);

    const cryptoKey = await crypto.subtle.importKey('raw', keyHash, { name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
    ]);

    const iv = crypto.getRandomValues(new Uint8Array(16));

    const ciphertext = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      cryptoKey,
      payload as BufferSource,
    );

    const encrypted = new Uint8Array(ciphertext);
    const encryptedData = encrypted.slice(0, -16);
    const authTag = encrypted.slice(-16);

    const toBase64 = (uint8Array: Uint8Array): string => {
      const binString = Array.from(uint8Array, (byte) => String.fromCodePoint(byte)).join('');
      return btoa(binString);
    };

    return {
      encrypted: toBase64(encryptedData),
      iv: toBase64(iv),
      authTag: toBase64(authTag),
    };
  }
}

const createPasswordChecksum = (password: string): string => {
  return CryptoJS.SHA256(password + 'check')
    .toString()
    .substring(0, 8);
};

const decryptWithPassword = async (encryptedBundle: any, password: string): Promise<UserCredentials> => {
  try {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const keyMaterial = await crypto.subtle.importKey('raw', passwordBuffer, 'PBKDF2', false, [
      'deriveBits',
      'deriveKey',
    ]);

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

    return JSON.parse(decryptedStr) as UserCredentials;
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

    const credentialBundle = await downloadDataFromSwarm(adminConfig.swarmRef);

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

    if (credentialBundle.checksum) {
      const checksum = createPasswordChecksum(password);
      if (credentialBundle.checksum !== checksum) {
        throw new Error('Invalid password');
      }
    }

    const credentials = await decryptWithPassword(encryptedData, password);

    if (!credentials || !credentials.userSecret) {
      throw new Error('Invalid decrypted data structure');
    }

    return {
      session: credentials,
    };
  } catch (error) {
    console.error('Login failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

export const nicknameLogin = async (nickname: string): Promise<LoginResult> => {
  const id = crypto.randomUUID();

  const signer = getSigner(id);
  if (!signer) {
    return { error: 'Invalid nickname' };
  }

  const privKey = signer.toHex();
  const pubKey = signer.publicKey().address().toHex();

  const session: Session = {
    instanceId: '',
    userId: pubKey,
    userSecret: privKey,
    serverKeys: {
      nginx: '',
      msrsIngestion: '',
      streamAggregator: '',
    },
    username: nickname,
    createdAt: Date.now(),
  };

  return {
    session,
  };
};

export const createStreamAggregatorToken = async (session: Session, message: Partial<StreamAggMessage>) => {
  const tokenGen = new TokenGenerator(session);
  const aggregatorToken = await tokenGen.generateServerToken('streamAggregator', message);
  return aggregatorToken;
};

export const createMsrsIngestionToken = async (session: Session, message: MsrsIngMessage) => {
  const tokenGen = new TokenGenerator(session);
  const ingestionToken = await tokenGen.generateServerToken('msrsIngestion', message);
  return ingestionToken;
};
