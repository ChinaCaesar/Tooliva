function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generateState(): string {
  return toBase64Url(randomBytes(32));
}

export function generateCodeVerifier(): string {
  return toBase64Url(randomBytes(32));
}

export async function computeCodeChallenge(codeVerifier: string): Promise<string> {
  const data = new TextEncoder().encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return toBase64Url(new Uint8Array(digest));
}

export function fromBase64Url(value: string): string {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (padded.length % 4)) % 4;
  const base64 = padded + '='.repeat(padLen);
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function decodeMockAuthorizationCode(code: string): import('./types').MockAuthCodePayload | null {
  try {
    const json = fromBase64Url(code);
    return JSON.parse(json) as import('./types').MockAuthCodePayload;
  } catch {
    return null;
  }
}
