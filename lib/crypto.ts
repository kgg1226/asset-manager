/**
 * AES-256-GCM 암호화/복호화 유틸리티
 * SystemConfig 테이블에 비밀 값을 저장할 때 사용
 *
 * 암호화 키:
 *   1순위: CONFIG_ENCRYPTION_KEY 환경변수 (64자 hex = 32바이트)
 *   2순위: DATABASE_URL에서 PBKDF2로 파생 (개발 환경용)
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM 권장 IV 길이
const TAG_LENGTH = 16; // GCM 기본 auth tag 길이

let _cachedKey: Buffer | null = null;

function getEncryptionKey(): Buffer {
  if (_cachedKey) return _cachedKey;

  const envKey = process.env.CONFIG_ENCRYPTION_KEY;
  if (envKey && envKey.length === 64) {
    _cachedKey = Buffer.from(envKey, "hex");
    return _cachedKey;
  }

  // 개발 환경 폴백: DATABASE_URL에서 파생
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error(
      "CONFIG_ENCRYPTION_KEY 또는 DATABASE_URL이 설정되어야 합니다."
    );
  }

  _cachedKey = crypto.pbkdf2Sync(dbUrl, "system-config-salt", 100000, 32, "sha256");
  return _cachedKey;
}

export function encrypt(plaintext: string): {
  ciphertext: string;
  iv: string;
  tag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    tag: tag.toString("hex"),
  };
}

export function decrypt(ciphertext: string, iv: string, tag: string): string {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "hex"),
    { authTagLength: TAG_LENGTH }
  );
  decipher.setAuthTag(Buffer.from(tag, "hex"));

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
