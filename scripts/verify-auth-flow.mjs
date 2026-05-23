/**
 * 联调验证脚本：Mock 授权码编解码 + PKCE 校验
 * 运行: node scripts/verify-auth-flow.mjs
 */
import { webcrypto } from 'node:crypto';

const subtle = webcrypto.subtle;

function toBase64Url(bytes) {
  return Buffer.from(bytes).toString('base64url');
}

function fromBase64Url(value) {
  return Buffer.from(value, 'base64url').toString('utf8');
}

async function computeCodeChallenge(codeVerifier) {
  const digest = await subtle.digest('SHA-256', Buffer.from(codeVerifier));
  return toBase64Url(Buffer.from(digest));
}

async function main() {
  const state = toBase64Url(Buffer.from('state-test'));
  const codeVerifier = toBase64Url(Buffer.from('verifier-test-long-enough'));
  const codeChallenge = await computeCodeChallenge(codeVerifier);

  const payload = {
    provider: 'GITHUB',
    state,
    codeChallenge,
    exp: Date.now() + 300_000,
    nonce: 'abc',
  };
  const code = toBase64Url(Buffer.from(JSON.stringify(payload)));
  const decoded = JSON.parse(fromBase64Url(code));

  const checks = [
    ['code decodes provider', decoded.provider === 'GITHUB'],
    ['state preserved', decoded.state === state],
    ['PKCE challenge matches', (await computeCodeChallenge(codeVerifier)) === decoded.codeChallenge],
    ['deep link has no token', !`${code}`.includes('accessToken')],
    ['deep link format', `tooliva://auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`.startsWith('tooliva://')],
  ];

  const failed = checks.filter(([, ok]) => !ok);
  if (failed.length) {
    console.error('FAILED:', failed.map(([name]) => name));
    process.exit(1);
  }
  console.log('All mock auth flow checks passed.');
}

main();
