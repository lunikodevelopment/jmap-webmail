/**
 * Email Encryption Types
 * Defines types for PGP/GPG email encryption
 */

export type EncryptionMethod = 'pgp' | 'gpg' | 'smime';
export type KeyType = 'public' | 'private';

export interface PGPKey {
  id: string;
  keyId: string;
  fingerprint: string;
  type: KeyType;
  algorithm: string;
  keySize: number;
  email: string;
  name?: string;
  createdAt: Date;
  expiresAt?: Date;
  isDefault: boolean;
  publicKeyArmored: string;
  privateKeyArmored?: string; // Only for private keys
}

export interface EncryptedEmail {
  id: string;
  emailId: string;
  encryptionMethod: EncryptionMethod;
  encryptedBody: string;
  encryptedSubject?: string;
  recipientKeyIds: string[];
  senderKeyId: string;
  isEncrypted: boolean;
  isSigned: boolean;
  signatureValid?: boolean;
  createdAt: Date;
}

export interface EncryptionSettings {
  enableEncryption: boolean;
  encryptionMethod: EncryptionMethod;
  autoEncryptToTrustedRecipients: boolean;
  autoSignEmails: boolean;
  defaultPrivateKeyId?: string;
  trustedRecipients: string[];
}

export interface KeyPair {
  publicKey: PGPKey;
  privateKey: PGPKey;
}

export interface EncryptionResult {
  success: boolean;
  encryptedData: string;
  error?: string;
}

export interface DecryptionResult {
  success: boolean;
  decryptedData: string;
  signatureValid?: boolean;
  signer?: string;
  error?: string;
}
