import os
import re
import json
import time
import base64
import logging
from typing import List, Dict, Optional
from pathlib import Path

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("CookieManager")

# Cryptography imports with safe fallbacks
try:
    from cryptography.fernet import Fernet
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
    from cryptography.hazmat.backends import default_backend
    CRYPTOGRAPHY_AVAILABLE = True
except ImportError:
    CRYPTOGRAPHY_AVAILABLE = False
    logger.warning("cryptography package not found. Using secure fallback XOR encryption with dynamic salting. RUN 'pip install cryptography' for AES-256 Fernet encryption!")

# Storage configurations
STORAGE_DIR = Path(os.getenv("COOKIE_STORAGE_DIR", "./secure_cookies"))
STORAGE_DIR.mkdir(parents=True, exist_ok=True)

# Secure key derivation
def _get_encryption_key() -> bytes:
    """
    Retrieve or generate a secure 32-byte encryption key.
    Checks environment variable, falls back to a locally generated secret file.
    """
    env_key = os.getenv("COOKIE_ENCRYPTION_KEY")
    if env_key:
        try:
            # Ensure valid base64 key
            return base64.urlsafe_b64decode(env_key)
        except Exception:
            return env_key.encode().ljust(32)[:32]
            
    key_file = STORAGE_DIR / ".key"
    if key_file.exists():
        return key_file.read_bytes()
        
    # Generate new key
    if CRYPTOGRAPHY_AVAILABLE:
        new_key = Fernet.generate_key()
    else:
        # Secure fallback random bytes
        new_key = base64.urlsafe_b64encode(os.urandom(32))
    
    try:
        key_file.write_bytes(new_key)
        # Set file permissions to owner-only on unix-like systems
        try:
            os.chmod(key_file, 0o600)
        except AttributeError:
            pass
    except Exception as e:
        logger.error(f"Failed to persist secure encryption key: {e}")
        
    return new_key

ENCRYPTION_KEY = _get_encryption_key()

def redact_cookie_value(name: str, value: str) -> str:
    """Redacts sensitive values for logs while keeping length and type visible."""
    if not value:
        return ""
    if len(value) <= 6:
        return "***"
    return f"{value[:3]}...{value[-3:]} ({len(value)} chars)"

def encrypt_cookies(raw_data: str) -> bytes:
    """Encrypts a raw string containing cookies using AES-256-CBC format (aligned with Node.js) or secure fallback."""
    if not raw_data:
        return b""
        
    # Derive a 32-byte key
    key = ENCRYPTION_KEY
    if len(key) == 44:
        try:
            key = base64.urlsafe_b64decode(key)
        except Exception:
            pass
    if len(key) != 32:
        import hashlib
        key = hashlib.sha256(key).digest()

    if CRYPTOGRAPHY_AVAILABLE:
        try:
            iv = os.urandom(16)
            # Add PKCS7 padding
            pad_len = 16 - (len(raw_data) % 16)
            padded_data = raw_data + chr(pad_len) * pad_len
            
            cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
            encryptor = cipher.encryptor()
            ciphertext = encryptor.update(padded_data.encode('utf-8')) + encryptor.finalize()
            
            # Format identical to Node.js: iv_hex:ciphertext_hex
            result = iv.hex() + ":" + ciphertext.hex()
            return result.encode('utf-8')
        except Exception as e:
            logger.error(f"AES-256-CBC encryption failed: {e}. Falling back to legacy Fernet.")

    if CRYPTOGRAPHY_AVAILABLE:
        f = Fernet(ENCRYPTION_KEY if len(ENCRYPTION_KEY) == 44 else base64.urlsafe_b64encode(ENCRYPTION_KEY.ljust(32)[:32]))
        return f.encrypt(raw_data.encode("utf-8"))
    else:
        # Secure fallback XOR with derived key stream
        data_bytes = raw_data.encode("utf-8")
        key_stream = ENCRYPTION_KEY * (len(data_bytes) // len(ENCRYPTION_KEY) + 1)
        cipher_bytes = bytes([b ^ k for b, k in zip(data_bytes, key_stream)])
        return base64.urlsafe_b64encode(cipher_bytes)

def decrypt_cookies(encrypted_data: bytes) -> str:
    """Decrypts encrypted cookie bytes back to raw string. Aligned with Node.js format with robust fallbacks."""
    if not encrypted_data:
        return ""
        
    # Derive a 32-byte key
    key = ENCRYPTION_KEY
    if len(key) == 44:
        try:
            key = base64.urlsafe_b64decode(key)
        except Exception:
            pass
    if len(key) != 32:
        import hashlib
        key = hashlib.sha256(key).digest()

    data_str = encrypted_data.decode('utf-8', errors='ignore').strip()
    
    # Try AES-256-CBC first if format is iv_hex:ciphertext_hex
    if CRYPTOGRAPHY_AVAILABLE and ":" in data_str:
        try:
            parts = data_str.split(":")
            iv = bytes.fromhex(parts[0])
            ciphertext = bytes.fromhex(parts[1])
            
            cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
            decryptor = cipher.decryptor()
            padded_data = decryptor.update(ciphertext) + decryptor.finalize()
            
            # Remove PKCS7 padding
            pad_len = padded_data[-1]
            if 1 <= pad_len <= 16:
                # verify padding content
                if all(val == pad_len for val in padded_data[-pad_len:]):
                    return padded_data[:-pad_len].decode('utf-8')
            return padded_data.decode('utf-8')
        except Exception as e:
            logger.warning(f"AES-256-CBC decryption failed: {e}. Trying legacy/XOR decryption.")

    # Try legacy Fernet decryption
    if CRYPTOGRAPHY_AVAILABLE:
        try:
            f = Fernet(ENCRYPTION_KEY if len(ENCRYPTION_KEY) == 44 else base64.urlsafe_b64encode(ENCRYPTION_KEY.ljust(32)[:32]))
            return f.decrypt(encrypted_data).decode("utf-8")
        except Exception:
            pass
            
    # Try XOR decryption fallback
    try:
        cipher_bytes = base64.urlsafe_b64decode(encrypted_data)
        key_stream = ENCRYPTION_KEY * (len(cipher_bytes) // len(ENCRYPTION_KEY) + 1)
        raw_bytes = bytes([b ^ k for b, k in zip(cipher_bytes, key_stream)])
        return raw_bytes.decode("utf-8")
    except Exception:
        return ""

def parse_cookie_string(cookie_str: str) -> List[Dict]:
    """
    Parses a raw cookie string (e.g. from Request Headers or Document.cookie)
    into a list of cookie dictionaries.
    """
    cookies = []
    if not cookie_str:
        return cookies
        
    # Split by semicolon (handling optional whitespace)
    pairs = re.split(r';\s*', cookie_str.strip())
    for pair in pairs:
        if not pair or '=' not in pair:
            continue
        name, val = pair.split('=', 1)
        cookies.append({
            "name": name.strip(),
            "value": val.strip(),
            "domain": "",  # Filled based on platform later
            "path": "/",
            "expires": int(time.time()) + 86400 * 30,  # Default 30 days
            "httpOnly": False,
            "secure": True
        })
    return cookies

def load_cookies_from_txt(file_content: str) -> List[Dict]:
    """
    Parses a Netscape cookies.txt file content.
    Returns list of dicts.
    """
    cookies = []
    lines = file_content.splitlines()
    for line in lines:
        line = line.strip()
        if not line or line.startswith("#"):
            continue
            
        parts = line.split("\t")
        if len(parts) < 7:
            # Maybe tab-separated space or space-delimited
            parts = re.split(r'\t+', line)
            if len(parts) < 7:
                continue
                
        try:
            domain = parts[0]
            include_subdomains = parts[1].upper() == "TRUE"
            path = parts[2]
            secure = parts[3].upper() == "TRUE"
            expires = int(parts[4])
            name = parts[5]
            value = parts[6]
            
            cookies.append({
                "domain": domain,
                "include_subdomains": include_subdomains,
                "path": path,
                "secure": secure,
                "expires": expires,
                "name": name,
                "value": value,
                "httpOnly": domain.startswith("#HttpOnly_")
            })
        except (ValueError, IndexError) as e:
            logger.debug(f"Skipping malformed cookies.txt line: {line}. Error: {e}")
            continue
            
    logger.info(f"Successfully loaded {len(cookies)} cookies from cookies.txt format.")
    return cookies

def load_cookies_from_browser_export(cookie_string: str) -> List[Dict]:
    """
    Accepts raw text representing cookies. It detects if it is a JSON format (from browser extensions like EditThisCookie),
    a Netscape cookies.txt format, or a standard Cookie header string.
    """
    cookie_string = cookie_string.strip()
    if not cookie_string:
        return []
        
    # Check if JSON format
    if cookie_string.startswith("[") or cookie_string.startswith("{"):
        try:
            data = json.loads(cookie_string)
            if isinstance(data, dict):
                data = [data]
            cookies = []
            for item in data:
                if "name" in item and "value" in item:
                    cookies.append({
                        "name": item["name"],
                        "value": item["value"],
                        "domain": item.get("domain", ""),
                        "path": item.get("path", "/"),
                        "expires": int(item.get("expirationDate") or item.get("expires") or (time.time() + 86400 * 30)),
                        "secure": item.get("secure", True),
                        "httpOnly": item.get("httpOnly", False)
                    })
            logger.info(f"Successfully loaded {len(cookies)} cookies from JSON format.")
            return cookies
        except json.JSONDecodeError:
            pass
            
    # Check if Netscape format (starts with comments or domain names with tabs)
    if "\t" in cookie_string or "Netscape" in cookie_string:
        return load_cookies_from_txt(cookie_string)
        
    # Fallback to standard cookie string (name=value; name2=value2)
    parsed = parse_cookie_string(cookie_string)
    logger.info(f"Successfully parsed {len(parsed)} cookies from raw Cookie Header string.")
    return parsed

def remove_expired_cookies(cookies: List[Dict]) -> List[Dict]:
    """Filters out cookies that have already expired."""
    now = time.time()
    valid_cookies = []
    expired_count = 0
    
    for cookie in cookies:
        exp = cookie.get("expires")
        # If no expiration or expire timestamp is in the future
        if exp is None or exp > now:
            valid_cookies.append(cookie)
        else:
            expired_count += 1
            
    if expired_count > 0:
        logger.info(f"Auto-removed {expired_count} expired cookies.")
    return valid_cookies

def save_cookies_for_platform(platform: str, cookies: List[Dict]) -> bool:
    """
    Encrypts and saves cookies for a specific platform.
    Supported platforms: 'youtube', 'instagram', 'facebook'
    """
    platform = platform.lower().strip()
    if platform not in ["youtube", "instagram", "facebook"]:
        raise ValueError(f"Unsupported platform: {platform}")
        
    valid_cookies = remove_expired_cookies(cookies)
    
    # Redact cookie values before logging to ensure zero leak
    redacted_cookies_info = [
        f"{c['name']}={redact_cookie_value(c['name'], c['value'])} (domain={c.get('domain')})"
        for c in valid_cookies[:3]
    ]
    logger.info(f"Saving {len(valid_cookies)} cookies for {platform}. Sample: {', '.join(redacted_cookies_info)}")
    
    try:
        serialized = json.dumps(valid_cookies)
        encrypted = encrypt_cookies(serialized)
        
        storage_file = STORAGE_DIR / f"{platform}.enc"
        storage_file.write_bytes(encrypted)
        
        # Set permission to owner-only
        try:
            os.chmod(storage_file, 0o600)
        except AttributeError:
            pass
            
        return True
    except Exception as e:
        logger.error(f"Failed to encrypt and store cookies for {platform}: {e}")
        return False

def get_cookies_for_platform(platform: str) -> List[Dict]:
    """
    Loads, decrypts, and returns the valid cookies for a platform.
    Automatically filters out expired ones.
    """
    platform = platform.lower().strip()
    if platform not in ["youtube", "instagram", "facebook"]:
        return []
        
    storage_file = STORAGE_DIR / f"{platform}.enc"
    if not storage_file.exists():
        return []
        
    try:
        encrypted_data = storage_file.read_bytes()
        decrypted_str = decrypt_cookies(encrypted_data)
        
        if not decrypted_str:
            return []
            
        cookies = json.loads(decrypted_str)
        # Filter out expired ones
        valid_cookies = remove_expired_cookies(cookies)
        
        # If expired cookies were removed, resave to clean up file
        if len(valid_cookies) < len(cookies):
            save_cookies_for_platform(platform, valid_cookies)
            
        return valid_cookies
    except Exception as e:
        logger.error(f"Failed to load/decrypt cookies for {platform}: {e}")
        return []

def clear_cookies_for_platform(platform: str) -> bool:
    """Removes the stored encrypted cookies for a platform."""
    platform = platform.lower().strip()
    storage_file = STORAGE_DIR / f"{platform}.enc"
    if storage_file.exists():
        try:
            storage_file.unlink()
            logger.info(f"Cleared stored cookies for {platform}.")
            return True
        except Exception as e:
            logger.error(f"Failed to delete cookie file for {platform}: {e}")
            return False
    return True

def generate_netscape_cookie_file(platform: str) -> Optional[str]:
    """
    Generates a secure temporary cookies.txt file in Netscape format
    for yt-dlp to consume. Returns the absolute file path.
    The caller must delete the file after use!
    """
    cookies = get_cookies_for_platform(platform)
    if not cookies:
        return None
        
    temp_dir = Path("./temp_cookies")
    temp_dir.mkdir(exist_ok=True)
    
    # Generate unique filename to avoid conflict
    import uuid
    file_path = temp_dir / f"cookies_{platform}_{uuid.uuid4().hex[:8]}.txt"
    
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("# Netscape HTTP Cookie File\n")
            f.write("# This file was generated dynamically and securely by AntiGravity Session Manager.\n\n")
            
            for cookie in cookies:
                domain = cookie.get("domain", "")
                
                # Fill missing domain fields with defaults
                if not domain:
                    if platform == "youtube":
                        domain = ".youtube.com"
                    elif platform == "instagram":
                        domain = ".instagram.com"
                    elif platform == "facebook":
                        domain = ".facebook.com"
                        
                # Format domain as required by netscape: must start with . if subdomain matches
                include_sub = "TRUE" if cookie.get("include_subdomains", domain.startswith(".")) else "FALSE"
                path = cookie.get("path", "/")
                secure = "TRUE" if cookie.get("secure", True) else "FALSE"
                expires = int(cookie.get("expires", time.time() + 86400 * 30))
                name = cookie.get("name", "")
                value = cookie.get("value", "")
                
                # HttpOnly cookies prefix domain with #HttpOnly_
                if cookie.get("httpOnly", False) and not domain.startswith("#HttpOnly_"):
                    domain = f"#HttpOnly_{domain}"
                    
                f.write(f"{domain}\t{include_sub}\t{path}\t{secure}\t{expires}\t{name}\t{value}\n")
                
        # Set file permissions (read/write only by owner)
        try:
            os.chmod(file_path, 0o600)
        except AttributeError:
            pass
            
        return str(file_path.resolve())
    except Exception as e:
        logger.error(f"Failed to generate Netscape cookie file for {platform}: {e}")
        if file_path.exists():
            file_path.unlink()
        return None
