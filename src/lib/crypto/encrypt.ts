import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// 환경변수 ENCRYPTION_KEY: 32바이트 hex 문자열 (64자)
function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64)
    throw new Error(
      "ENCRYPTION_KEY 환경변수가 올바르지 않습니다 (64자 hex 필요)",
    );
  return Buffer.from(hex, "hex");
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf-8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // iv(12) + authTag(16) + ciphertext를 base64로 합침
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(encrypted: string): string {
  const key = getKey();
  const data = Buffer.from(encrypted, "base64");
  const iv = data.subarray(0, 12);
  const authTag = data.subarray(12, 28);
  const ciphertext = data.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final("utf-8");
}
