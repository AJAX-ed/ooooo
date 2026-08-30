import { randomBytes, createHash } from "crypto";

const QR_TOKEN_LENGTH = 32;

export function generateSecureQrToken(): string {
  return randomBytes(QR_TOKEN_LENGTH).toString("hex");
}

export function hashQrToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function validateQrTokenFormat(token: string): boolean {
  if (!token || typeof token !== "string") return false;
  if (token.length < 32 || token.length > 256) return false;
  return /^[a-f0-9]+$/i.test(token);
}
