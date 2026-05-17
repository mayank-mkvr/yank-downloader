import logging
import requests
import re
from typing import Dict, Optional
from python.cookie_manager import get_cookies_for_platform, redact_cookie_value

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("SessionLoader")

# Realistic browser headers for supported platforms
BROWSER_HEADERS = {
    "youtube": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.youtube.com/",
        "Connection": "keep-alive",
        "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124", "Google Chrome";v="124"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1"
    },
    "instagram": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.instagram.com/",
        "Connection": "keep-alive",
        "X-Ig-App-Id": "936619743392459", # Standard web app id
        "X-Requested-With": "XMLHttpRequest",
        "Sec-Ch-Ua-Platform": '"Windows"',
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin"
    },
    "facebook": {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://www.facebook.com/",
        "Connection": "keep-alive",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Upgrade-Insecure-Requests": "1"
    }
}

def detect_platform_from_url(url: str) -> Optional[str]:
    """Detects platform (youtube, instagram, facebook, onedrive, telegram) from a URL."""
    url_lower = url.lower()
    if any(pattern in url_lower for pattern in ["youtube.com", "youtu.be"]):
        return "youtube"
    elif "instagram.com" in url_lower:
        return "instagram"
    elif any(pattern in url_lower for pattern in ["facebook.com", "fb.watch", "fb.gg"]):
        return "facebook"
    elif any(pattern in url_lower for pattern in ["onedrive.live.com", "onedrive"]):
        return "onedrive"
    elif any(pattern in url_lower for pattern in ["t.me", "telegram.me"]):
        return "telegram"
    return None

def attach_platform_headers(platform: str, headers: Optional[Dict] = None) -> Dict:
    """Returns realistic browser headers for the given platform, merging existing headers if provided."""
    platform = platform.lower().strip()
    base_headers = BROWSER_HEADERS.get(platform, {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Connection": "keep-alive"
    }).copy()
    
    if headers:
        base_headers.update(headers)
    return base_headers

def create_authenticated_session(platform: str) -> requests.Session:
    """
    Creates a requests.Session, loads decrypted platform cookies into it,
    and attaches standard realistic browser headers.
    """
    platform = platform.lower().strip()
    session = requests.Session()
    
    # 1. Attach Platform Headers
    session.headers.update(attach_platform_headers(platform))
    
    # 2. Retrieve Decrypted Cookies
    cookies = get_cookies_for_platform(platform)
    
    # 3. Add to Session CookieJar
    for cookie in cookies:
        domain = cookie.get("domain", "")
        # If no domain, default to matching target
        if not domain:
            if platform == "youtube":
                domain = ".youtube.com"
            elif platform == "instagram":
                domain = ".instagram.com"
            elif platform == "facebook":
                domain = ".facebook.com"
            elif platform == "onedrive":
                domain = ".live.com"
            elif platform == "telegram":
                domain = ".t.me"
                
        # Build requests-compatible cookie jar
        session.cookies.set(
            name=cookie["name"],
            value=cookie["value"],
            domain=domain,
            path=cookie.get("path", "/"),
            secure=cookie.get("secure", True),
            rest={'HttpOnly': cookie.get("httpOnly", False)}
        )
        
    logger.info(f"Created authenticated session for {platform} with {len(cookies)} cookies loaded.")
    return session

def validate_session(session: requests.Session, platform: str) -> bool:
    """
    Validates if the session cookies are authentic and actually logged-in.
    Returns True if valid, False otherwise.
    Uses lightweight requests to official profile endpoints.
    """
    platform = platform.lower().strip()
    
    try:
        if platform == "youtube":
            # Check YouTube Studio or account page
            response = session.get(
                "https://www.youtube.com/upload", 
                allow_redirects=True, 
                timeout=10
            )
            # Logged-in users will access upload endpoint without redirecting to a login page
            is_valid = "login" not in response.url and response.status_code == 200
            
            # Additional check: page should contain user identifiers
            if is_valid and "creator_profile" not in response.text.lower() and "sign in" in response.text.lower():
                is_valid = False
                
            logger.info(f"YouTube Session validation status: {is_valid}")
            return is_valid
            
        elif platform == "instagram":
            # Instagram check: query the private profile endpoint or general app state
            # A valid cookie session will allow fetching account details
            response = session.get(
                "https://www.instagram.com/api/v1/users/web_profile_info/?username=instagram",
                timeout=10
            )
            # Instagram returns 200 JSON for web profile info if valid. If blocked/logged out, returns 400/403 or redirects.
            is_valid = response.status_code == 200
            
            logger.info(f"Instagram Session validation status: {is_valid}")
            return is_valid
            
        elif platform == "facebook":
            # Facebook check: query personal settings page or edit profile
            response = session.get(
                "https://www.facebook.com/settings", 
                allow_redirects=True, 
                timeout=10
            )
            # If redirected to login, the cookie is invalid
            is_valid = "login.php" not in response.url and response.status_code == 200
            
            logger.info(f"Facebook Session validation status: {is_valid}")
            return is_valid
            
        elif platform == "onedrive":
            response = session.get("https://onedrive.live.com/", allow_redirects=True, timeout=10)
            is_valid = "login.live.com" not in response.url and response.status_code == 200
            logger.info(f"OneDrive Session validation status: {is_valid}")
            return is_valid
            
        elif platform == "telegram":
            response = session.get("https://t.me/", allow_redirects=True, timeout=10)
            is_valid = response.status_code == 200
            logger.info(f"Telegram Session validation status: {is_valid}")
            return is_valid
            
    except Exception as e:
        logger.error(f"Error validating {platform} session: {e}")
        return False
        
    return False

def make_authenticated_request(url: str, session: Optional[requests.Session] = None) -> requests.Response:
    """
    Given a URL:
    1. Detects platform from URL.
    2. Loads platform session (if not already provided).
    3. Fetches the page using the secure authenticated request session.
    """
    platform = detect_platform_from_url(url)
    if not platform:
        # Fallback to standard request
        logger.info(f"No platform matched for URL {url}. Making standard unauthenticated request.")
        return requests.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}, timeout=15)
        
    if not session:
        session = create_authenticated_session(platform)
        
    logger.info(f"Fetching {url} using authenticated {platform} session.")
    
    # Secure request execution
    response = session.get(url, timeout=20)
    return response
