import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KEYS_DIR = path.join(__dirname, '..', '..', '.keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.pem');

export const loadKeys = () => {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR, { recursive: true });
  }

  let privateKey, publicKey;

  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
  } else {
    console.log('Generating new 2048-bit RSA key pair for RS256 JWT tokens...');
    const { privateKey: privKey, publicKey: pubKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    fs.writeFileSync(PRIVATE_KEY_PATH, privKey, 'utf8');
    fs.writeFileSync(PUBLIC_KEY_PATH, pubKey, 'utf8');
    
    privateKey = privKey;
    publicKey = pubKey;
    console.log('RSA Key Pair generated successfully and stored in .keys/ directory.');
  }

  return { privateKey, publicKey };
};

const keys = loadKeys();
export const PRIVATE_KEY = keys.privateKey;
export const PUBLIC_KEY = keys.publicKey;
