import fs from 'fs';
import path from 'path';

export function getRandomProxy(): string | null {
  try {
    const proxyPath = path.resolve(process.cwd(), 'proxies.txt');
    if (!fs.existsSync(proxyPath)) return null;
    
    const proxies = fs.readFileSync(proxyPath, 'utf-8')
      .split('\n')
      .map(p => p.trim())
      .filter(p => p.length > 0 && !p.startsWith('#'));
      
    if (proxies.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * proxies.length);
    return proxies[randomIndex];
  } catch (err) {
    console.error('Error reading proxies:', err);
    return null;
  }
}
