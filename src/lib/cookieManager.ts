import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  secure: boolean;
  httpOnly: boolean;
  include_subdomains?: boolean;
}

const STORAGE_DIR = process.env.COOKIE_STORAGE_DIR || 
  (process.env.NODE_ENV === 'production' ? '/tmp/secure_cookies' : path.resolve(process.cwd(), 'secure_cookies'));

if (!fs.existsSync(STORAGE_DIR)) {
  fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// Secure key derivation
const getKey = (): Buffer => {
  const envKey = process.env.COOKIE_ENCRYPTION_KEY;
  if (envKey) {
    return crypto.scryptSync(envKey, 'salt', 32);
  }
  
  const keyFile = path.join(STORAGE_DIR, '.key');
  if (fs.existsSync(keyFile)) {
    return fs.readFileSync(keyFile);
  }
  
  const newKey = crypto.randomBytes(32);
  fs.writeFileSync(keyFile, newKey);
  return newKey;
};

// AES-256-CBC encryption and decryption
const encrypt = (text: string): string => {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

const decrypt = (encryptedText: string): string => {
  const key = getKey();
  const parts = encryptedText.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encrypted = parts.join(':');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Cookie parsers
export const parseCookieString = (cookieStr: string): Cookie[] => {
  const cookies: Cookie[] = [];
  if (!cookieStr) return cookies;
  
  const trimmed = cookieStr.trim();
  
  // 1. JSON Format
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item.name && item.value) {
          cookies.push({
            name: item.name,
            value: item.value,
            domain: item.domain || '',
            path: item.path || '/',
            expires: item.expirationDate || item.expires || Math.floor(Date.now() / 1000) + 86400 * 30,
            secure: item.secure !== false,
            httpOnly: item.httpOnly === true
          });
        }
      }
      return cookies;
    } catch {}
  }
  
  // 2. Netscape format
  if (cookieStr.includes('\t') || cookieStr.includes('Netscape')) {
    const lines = cookieStr.split(/\r?\n/);
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue;
      
      const parts = line.split('\t');
      if (parts.length >= 7) {
        try {
          const domain = parts[0];
          const include_subdomains = parts[1].toUpperCase() === 'TRUE';
          const path = parts[2];
          const secure = parts[3].toUpperCase() === 'TRUE';
          const expires = parseInt(parts[4]);
          const name = parts[5];
          const value = parts[6];
          
          cookies.push({
            domain,
            include_subdomains,
            path,
            secure,
            expires,
            name,
            value,
            httpOnly: domain.startsWith('#HttpOnly_')
          });
        } catch {}
      }
    }
    return cookies;
  }
  
  // 3. Raw standard cookie header string (name=value; name2=value2)
  const pairs = cookieStr.split(/;\s*/);
  for (const pair of pairs) {
    if (!pair || !pair.includes('=')) continue;
    const eqIdx = pair.indexOf('=');
    const name = pair.substring(0, eqIdx).trim();
    const value = pair.substring(eqIdx + 1).trim();
    if (name) {
      cookies.push({
        name,
        value,
        domain: '',
        path: '/',
        expires: Math.floor(Date.now() / 1000) + 86400 * 30,
        secure: true,
        httpOnly: false
      });
    }
  }
  
  return cookies;
};

// Platform manager
export const saveCookiesForPlatform = (platform: string, cookies: Cookie[]): boolean => {
  const plat = platform.toLowerCase().trim();
  if (!['youtube', 'instagram', 'facebook', 'onedrive', 'telegram'].includes(plat)) {
    throw new Error(`Unsupported platform: ${platform}`);
  }
  
  const now = Math.floor(Date.now() / 1000);
  const validCookies = cookies.filter(c => !c.expires || c.expires > now);
  
  try {
    const serialized = JSON.stringify(validCookies);
    const encrypted = encrypt(serialized);
    
    const storageFile = path.join(STORAGE_DIR, `${plat}.enc`);
    fs.writeFileSync(storageFile, encrypted, 'utf8');
    return true;
  } catch (e) {
    console.error(`Failed to save cookies for ${platform}:`, e);
    return false;
  }
};

export const getCookiesForPlatform = (platform: string): Cookie[] => {
  const plat = platform.toLowerCase().trim();
  if (!['youtube', 'instagram', 'facebook', 'onedrive', 'telegram'].includes(plat)) {
    return [];
  }
  
  const storageFile = path.join(STORAGE_DIR, `${plat}.enc`);
  if (!fs.existsSync(storageFile)) {
    return [];
  }
  
  try {
    const encryptedData = fs.readFileSync(storageFile, 'utf8');
    const decryptedStr = decrypt(encryptedData);
    if (!decryptedStr) return [];
    
    const cookies: Cookie[] = JSON.parse(decryptedStr);
    const now = Math.floor(Date.now() / 1000);
    const validCookies = cookies.filter(c => !c.expires || c.expires > now);
    
    if (validCookies.length < cookies.length) {
      saveCookiesForPlatform(plat, validCookies);
    }
    
    return validCookies;
  } catch (e) {
    console.error(`Failed to get cookies for ${platform}:`, e);
    return [];
  }
};

export const clearCookiesForPlatform = (platform: string): boolean => {
  const plat = platform.toLowerCase().trim();
  const storageFile = path.join(STORAGE_DIR, `${plat}.enc`);
  if (fs.existsSync(storageFile)) {
    try {
      fs.unlinkSync(storageFile);
      return true;
    } catch (e) {
      console.error(`Failed to clear cookies for ${platform}:`, e);
      return false;
    }
  }
  return true;
};

// Netscape generator
export const generateNetscapeCookieFile = (platform: string): string | null => {
  const cookies = getCookiesForPlatform(platform);
  if (cookies.length === 0) return null;
  
  const tempDir = path.resolve(process.cwd(), 'temp_cookies');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const uniqueId = crypto.randomBytes(4).toString('hex');
  const filePath = path.join(tempDir, `cookies_${platform}_${uniqueId}.txt`);
  
  try {
    let content = "# Netscape HTTP Cookie File\n";
    content += "# Generated dynamically by Next.js Secure Cookie Manager\n\n";
    
    for (const cookie of cookies) {
      let domain = cookie.domain;
      if (!domain) {
        if (platform === 'youtube') domain = '.youtube.com';
        else if (platform === 'instagram') domain = '.instagram.com';
        else if (platform === 'facebook') domain = '.facebook.com';
        else domain = '.live.com';
      }
      
      const includeSub = cookie.include_subdomains !== false && domain.startsWith('.') ? 'TRUE' : 'FALSE';
      const cookiePath = cookie.path || '/';
      const secure = cookie.secure ? 'TRUE' : 'FALSE';
      const expires = cookie.expires ? Math.floor(cookie.expires) : Math.floor(Date.now() / 1000) + 86400 * 30;
      const name = cookie.name || '';
      const value = cookie.value || '';
      
      let finalDomain = domain;
      if (cookie.httpOnly && !finalDomain.startsWith('#HttpOnly_')) {
        finalDomain = `#HttpOnly_${finalDomain}`;
      }
      
      content += `${finalDomain}\t${includeSub}\t${cookiePath}\t${secure}\t${expires}\t${name}\t${value}\n`;
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
  } catch (e) {
    console.error(`Failed to generate netscape cookie file for ${platform}:`, e);
    return null;
  }
};
