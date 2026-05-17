import os
import sys
import json
import shutil
import logging
import subprocess
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from pydantic import BaseModel

# Import our custom components
from python.cookie_manager import (
    load_cookies_from_browser_export,
    save_cookies_for_platform,
    get_cookies_for_platform,
    clear_cookies_for_platform,
    generate_netscape_cookie_file
)
from python.session_loader import (
    detect_platform_from_url,
    create_authenticated_session,
    validate_session
)

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("PythonApp")

app = FastAPI(
    title="Yank Downloader Authenticated Session Engine",
    description="Python API microservice for handling secure cookie session uploads, validation, and authenticated downloading.",
    version="1.0.0"
)

# Add CORS Middleware to match node/next origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Find yt-dlp path
def get_ytdlp_path() -> str:
    """Finds yt-dlp executable in workspace or system PATH."""
    workspace_exe = Path("./yt-dlp.exe")
    if workspace_exe.exists():
        return str(workspace_exe.resolve())
    
    workspace_bin = Path("./yt-dlp")
    if workspace_bin.exists():
        return str(workspace_bin.resolve())
        
    system_path = shutil.which("yt-dlp")
    if system_path:
        return system_path
        
    logger.warning("yt-dlp executable not found! Falling back to 'yt-dlp' command execution.")
    return "yt-dlp"

YTDLP_CMD = get_ytdlp_path()

# Models
class CookieUploadRequest(BaseModel):
    platform: str
    cookie_data: str

class AnalyzeRequest(BaseModel):
    url: str

# Endpoints
@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "ytdlp_path": YTDLP_CMD,
        "platform": sys.platform,
        "python_version": sys.version
    }

@app.post("/api/cookies/upload")
def upload_cookies(payload: CookieUploadRequest):
    """
    Pastes cookie strings or raw JSON, decrypts/encrypts and stores them.
    """
    platform = payload.platform.lower().strip()
    if platform not in ["youtube", "instagram", "facebook", "onedrive", "telegram"]:
        raise HTTPException(status_code=400, detail="Invalid platform. Must be 'youtube', 'instagram', 'facebook', 'onedrive', or 'telegram'.")
        
    try:
        cookies = load_cookies_from_browser_export(payload.cookie_data)
        if not cookies:
            raise HTTPException(status_code=400, detail="Could not parse any valid cookies from input. Provide cookies.txt format, JSON format, or raw Cookie Header.")
            
        success = save_cookies_for_platform(platform, cookies)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to securely encrypt and store cookies.")
            
        return {
            "success": True,
            "message": f"Successfully stored and encrypted {len(cookies)} cookies for {platform.capitalize()}.",
            "count": len(cookies)
        }
    except Exception as e:
        logger.error(f"Error handling cookie upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/cookies/upload-file")
async def upload_cookies_file(
    platform: str = Form(...),
    file: UploadFile = File(...)
):
    """
    Uploads a cookies.txt or JSON cookies file.
    """
    platform = platform.lower().strip()
    if platform not in ["youtube", "instagram", "facebook", "onedrive", "telegram"]:
        raise HTTPException(status_code=400, detail="Invalid platform.")
        
    try:
        contents = await file.read()
        cookie_data = contents.decode("utf-8", errors="ignore")
        
        cookies = load_cookies_from_browser_export(cookie_data)
        if not cookies:
            raise HTTPException(status_code=400, detail="Could not parse any valid cookies from uploaded file.")
            
        success = save_cookies_for_platform(platform, cookies)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to securely encrypt and store cookies.")
            
        return {
            "success": True,
            "message": f"Successfully stored and encrypted {len(cookies)} cookies for {platform.capitalize()} from file.",
            "count": len(cookies)
        }
    except Exception as e:
        logger.error(f"Error handling cookie file upload: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/cookies/status")
def get_cookies_status():
    """
    Returns cookie counts and validation states for all supported platforms.
    """
    result = {}
    for platform in ["youtube", "instagram", "facebook", "onedrive", "telegram"]:
        cookies = get_cookies_for_platform(platform)
        if not cookies:
            result[platform] = {
                "configured": False,
                "count": 0,
                "valid": False
            }
        else:
            # Check validation state securely
            session = create_authenticated_session(platform)
            is_valid = validate_session(session, platform)
            
            result[platform] = {
                "configured": True,
                "count": len(cookies),
                "valid": is_valid
            }
    return result

@app.post("/api/cookies/clear")
def clear_cookies(platform: str = Query(...)):
    """
    Clears the stored cookies for a platform.
    """
    platform = platform.lower().strip()
    if platform not in ["youtube", "instagram", "facebook", "onedrive", "telegram"]:
        raise HTTPException(status_code=400, detail="Invalid platform.")
        
    success = clear_cookies_for_platform(platform)
    return {"success": success, "message": f"Cookies cleared for {platform}."}

@app.post("/api/analyze")
def analyze_video(payload: AnalyzeRequest):
    """
    Analyzes a URL using yt-dlp library programmatically in-process with dynamic cookies.
    Forces high quality sorting and estimates missing filesizes.
    """
    url = payload.url.strip()
    if not url:
        raise HTTPException(status_code=400, detail="URL cannot be empty.")
        
    platform = detect_platform_from_url(url)
    cookie_file_path = None
    
    # Generate secure temp cookie file if platform is matched and has active cookies
    if platform:
        cookie_file_path = generate_netscape_cookie_file(platform)
        if cookie_file_path:
            logger.info(f"Loaded secure temp cookie file for {platform} at {cookie_file_path}")
            
    ydl_opts = {
        'noplaylist': True,
        'quiet': True,
        'no_warnings': True,
        'nocheckcertificate': True,
        'socket_timeout': 30,
        'ignoreconfig': True,
    }
    
    if cookie_file_path:
        ydl_opts['cookiefile'] = cookie_file_path
        
    try:
        metadata = None
        # Optimization: YouTube always goes to CLI wrapper first to avoid JS runtime missing warnings!
        if platform == "youtube":
            logger.info("YouTube detected. Bypassing programmatic library and using optimized standalone CLI wrapper directly...")
            import subprocess
            import json
            args = [
                YTDLP_CMD,
                "--ignore-config",
                "-j",
                "--no-warnings",
                "--no-playlist",
                "--no-check-certificate",
                "--socket-timeout", "15",
                url
            ]
            if cookie_file_path:
                args.extend(["--cookies", cookie_file_path])
            result = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=25)
            
            if result.returncode != 0 and cookie_file_path:
                logger.warning("YouTube CLI extraction with cookies failed. Retrying WITHOUT cookies...")
                args = [
                    YTDLP_CMD,
                    "--ignore-config",
                    "-j",
                    "--no-warnings",
                    "--no-playlist",
                    "--no-check-certificate",
                    "--socket-timeout", "15",
                    url
                ]
                result = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=25)
                
            if result.returncode != 0:
                error_msg = result.stderr.strip() or "Unknown error extracting YouTube metadata"
                raise Exception(f"YouTube CLI extraction failed: {error_msg}")
            metadata = json.loads(result.stdout)
        else:
            # Other platforms use programmatic in-process library first (extremely fast and doesn't require JS runtime)
            try:
                logger.info(f"Extracting video metadata in-process using yt_dlp library for {url}")
                import yt_dlp
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    metadata = ydl.extract_info(url, download=False)
            except Exception as programmatic_err:
                logger.warning(f"Programmatic metadata extraction failed: {programmatic_err}. Falling back to CLI wrapper...")
                import subprocess
                import json
                args = [
                    YTDLP_CMD,
                    "--ignore-config",
                    "-j",
                    "--no-warnings",
                    "--no-playlist",
                    "--no-check-certificate",
                    "--socket-timeout", "15",
                    url
                ]
                if cookie_file_path:
                    args.extend(["--cookies", cookie_file_path])
                result = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=25)
                
                if result.returncode != 0 and cookie_file_path:
                    logger.warning("CLI fallback with cookies failed. Retrying WITHOUT cookies...")
                    args = [
                        YTDLP_CMD,
                        "--ignore-config",
                        "-j",
                        "--no-warnings",
                        "--no-playlist",
                        "--no-check-certificate",
                        "--socket-timeout", "15",
                        url
                    ]
                    result = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="ignore", timeout=25)
                    
                if result.returncode != 0:
                    error_msg = result.stderr.strip() or "Unknown error extracting metadata"
                    raise Exception(f"CLI fallback extraction failed: {error_msg}")
                metadata = json.loads(result.stdout)
            
        # Always clean up secure temp cookie file immediately
        if cookie_file_path and os.path.exists(cookie_file_path):
            os.unlink(cookie_file_path)
            
        # Formulate a simplified response
        formats = metadata.get("formats", [])
        duration = metadata.get("duration") or 0
        quality_list = []
        
        seen_format_ids = set()
        for f in formats:
            vcodec = f.get("vcodec")
            acodec = f.get("acodec")
            
            # Skip if both are missing or 'none'
            if (not vcodec or vcodec == "none") and (not acodec or acodec == "none"):
                continue
                
            format_id = f.get("format_id")
            if not format_id or format_id in seen_format_ids:
                continue
            seen_format_ids.add(format_id)
            
            height = f.get("height") or 0
            # If it's an audio format, represent it as 0 height
            if vcodec == "none" or not vcodec:
                height = 0
                
            # Filesize extraction and dynamic estimation
            filesize = f.get("filesize") or f.get("filesize_approx") or 0
            if not filesize:
                # Mathematically estimate filesize from bitrate (tbr or vbr) and duration
                bitrate = f.get("tbr") or f.get("vbr") or 0 # kbps
                if bitrate > 0 and duration > 0:
                    filesize = int((bitrate * 1000 * duration) / 8)
            
            quality_list.append({
                "formatId": f.get("format_id"),
                "quality": f.get("format_note") or f.get("resolution") or f"{height}p" or "unknown",
                "ext": f.get("ext", "mp4"),
                "filesize": filesize,
                "vcodec": vcodec,
                "acodec": acodec,
                "height": height
            })
            
        # Sort qualities descending (highest resolution and best video formats first)
        quality_list.sort(key=lambda x: (x.get("height", 0), x.get("filesize", 0)), reverse=True)
        
        return {
            "id": metadata.get("id"),
            "title": metadata.get("title", "download"),
            "author": metadata.get("uploader") or metadata.get("channel") or "Unknown",
            "thumbnail": metadata.get("thumbnail") or "",
            "duration": duration,
            "formats": quality_list[:60], # Safe limit returning high quality options
            "source": metadata.get("extractor", platform or "unknown")
        }
    except Exception as e:
        if cookie_file_path and os.path.exists(cookie_file_path):
            os.unlink(cookie_file_path)
        logger.error(f"Analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/download")
def download_stream(
    background_tasks: BackgroundTasks,
    url: str = Query(...),
    formatId: str = Query("best"),
    title: str = Query("download")
):
    """
    Downloads and streams the video using highly optimized zero-memory direct FileResponse
    with async background cleanup of temporary directories.
    """
    platform = detect_platform_from_url(url)
    cookie_file_path = None
    
    if platform:
        cookie_file_path = generate_netscape_cookie_file(platform)
        
    import re
    import urllib.parse
    import tempfile
    import yt_dlp
    
    # Remove characters that are illegal in file names
    clean_title = re.sub(r'[\\/*?:"<>|]', "", title)
    sanitized_title = f"{clean_title}.mp4" if formatId != "bestaudio" else f"{clean_title}.mp3"
    content_type = "video/mp4" if formatId != "bestaudio" else "audio/mpeg"
    
    # Manually create the temporary directory so we don't automatically delete it before FileResponse finishes!
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Optimization: Merge video-only streams with the best audio automatically to avoid silent videos!
        format_spec = f"{formatId}+bestaudio/best" if formatId != "bestaudio" else "bestaudio"
        
        ydl_opts = {
            'format': format_spec,
            'outtmpl': os.path.join(temp_dir, '%(title)s.%(ext)s'),
            'noplaylist': True,
            'quiet': True,
            'no_warnings': True,
            'nocheckcertificate': True,
            'socket_timeout': 60,
            'ignoreconfig': True,
        }
        
        # If the format is MP3 / Extract audio
        if formatId == "bestaudio":
            ydl_opts.update({
                'format': 'bestaudio',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'mp3',
                    'preferredquality': '0',
                }],
            })
            
        if cookie_file_path:
            ydl_opts['cookiefile'] = cookie_file_path
            
        if platform == "youtube":
            logger.info("YouTube detected. Bypassing programmatic library and using optimized standalone CLI wrapper directly for download...")
            import subprocess
            args = [
                YTDLP_CMD,
                "--ignore-config",
                "-f", format_spec,
                "--no-warnings",
                "--no-check-certificate",
                "--socket-timeout", "60",
                "-o", os.path.join(temp_dir, "%(title)s.%(ext)s"),
                url
            ]
            if formatId == "bestaudio":
                args = [
                    YTDLP_CMD,
                    "--ignore-config",
                    "-f", "bestaudio",
                    "--no-warnings",
                    "--no-check-certificate",
                    "--socket-timeout", "60",
                    "--extract-audio",
                    "--audio-format", "mp3",
                    "--audio-quality", "0",
                    "-o", os.path.join(temp_dir, "%(title)s.%(ext)s"),
                    url
                ]
            if cookie_file_path:
                args.extend(["--cookies", cookie_file_path])
            
            result = subprocess.run(args, capture_output=True, text=True, errors="ignore", timeout=120)
            
            if result.returncode != 0 and cookie_file_path:
                logger.warning("YouTube CLI download with cookies failed. Retrying WITHOUT cookies...")
                args = [
                    YTDLP_CMD,
                    "--ignore-config",
                    "-f", format_spec,
                    "--no-warnings",
                    "--no-check-certificate",
                    "--socket-timeout", "60",
                    "-o", os.path.join(temp_dir, "%(title)s.%(ext)s"),
                    url
                ]
                if formatId == "bestaudio":
                    args = [
                        YTDLP_CMD,
                        "--ignore-config",
                        "-f", "bestaudio",
                        "--no-warnings",
                        "--no-check-certificate",
                        "--socket-timeout", "60",
                        "--extract-audio",
                        "--audio-format", "mp3",
                        "--audio-quality", "0",
                        "-o", os.path.join(temp_dir, "%(title)s.%(ext)s"),
                        url
                    ]
                result = subprocess.run(args, capture_output=True, text=True, errors="ignore", timeout=120)
                
            if result.returncode != 0:
                logger.warning("YouTube CLI quality download failed. Retrying with fallback best formats...")
                args = [
                    YTDLP_CMD,
                    "--ignore-config",
                    "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                    "--no-warnings",
                    "--no-check-certificate",
                    "--socket-timeout", "60",
                    "-o", os.path.join(temp_dir, "%(title)s.%(ext)s"),
                    url
                ]
                if cookie_file_path:
                    args.extend(["--cookies", cookie_file_path])
                result = subprocess.run(args, capture_output=True, text=True, errors="ignore", timeout=120)
                
                if result.returncode != 0 and cookie_file_path:
                    logger.warning("YouTube CLI fallback download with cookies failed. Retrying WITHOUT cookies...")
                    args = [
                        YTDLP_CMD,
                        "--ignore-config",
                        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                        "--no-warnings",
                        "--no-check-certificate",
                        "--socket-timeout", "60",
                        "-o", os.path.join(temp_dir, "%(title)s.%(ext)s"),
                        url
                    ]
                    subprocess.run(args, capture_output=True, text=True, errors="ignore", timeout=120)
        else:
            # Other platforms use programmatic in-process library first
            try:
                try:
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        ydl.extract_info(url, download=True)
                except Exception as first_err:
                    logger.warning(f"Primary programmatic format download failed: {first_err}. Retrying with exact fallback format...")
                    ydl_opts['format'] = 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best'
                    if 'postprocessors' in ydl_opts:
                        del ydl_opts['postprocessors']
                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        ydl.extract_info(url, download=True)
            except Exception as programmatic_err:
                logger.warning(f"Programmatic download failed: {programmatic_err}. Falling back to CLI subprocess wrapper...")
                import subprocess
                args = [
                    YTDLP_CMD,
                    "--ignore-config",
                    "-f", format_spec,
                    "--no-warnings",
                    "--no-check-certificate",
                    "--socket-timeout", "60",
                    "-o", os.path.join(temp_dir, "%(title)s.%(ext)s"),
                    url
                ]
                if formatId == "bestaudio":
                    args = [
                        YTDLP_CMD,
                        "--ignore-config",
                        "-f", "bestaudio",
                        "--no-warnings",
                        "--no-check-certificate",
                        "--socket-timeout", "60",
                        "--extract-audio",
                        "--audio-format", "mp3",
                        "--audio-quality", "0",
                        "-o", os.path.join(temp_dir, "%(title)s.%(ext)s"),
                        url
                    ]
                if cookie_file_path:
                    args.extend(["--cookies", cookie_file_path])
                
                result = subprocess.run(args, capture_output=True, text=True, errors="ignore", timeout=120)
                
                if result.returncode != 0 and cookie_file_path:
                    logger.warning("CLI download with cookies failed. Retrying CLI download WITHOUT cookies...")
                    args = [
                        YTDLP_CMD,
                        "--ignore-config",
                        "-f", format_spec,
                        "--no-warnings",
                        "--no-check-certificate",
                        "--socket-timeout", "60",
                        "-o", os.path.join(temp_dir, "%(title)s.%(ext)s"),
                        url
                    ]
                    if formatId == "bestaudio":
                        args = [
                            YTDLP_CMD,
                            "--ignore-config",
                            "-f", "bestaudio",
                            "--no-warnings",
                            "--no-check-certificate",
                            "--socket-timeout", "60",
                            "--extract-audio",
                            "--audio-format", "mp3",
                            "--audio-quality", "0",
                            "-o", os.path.join(temp_dir, "%(title)s.%(ext)s"),
                            url
                        ]
                    result = subprocess.run(args, capture_output=True, text=True, errors="ignore", timeout=120)
                    
                if result.returncode != 0:
                    logger.warning("CLI quality download failed. Retrying with fallback best formats...")
                    args = [
                        YTDLP_CMD,
                        "--ignore-config",
                        "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                        "--no-warnings",
                        "--no-check-certificate",
                        "--socket-timeout", "60",
                        "-o", os.path.join(temp_dir, "%(title)s.%(ext)s"),
                        url
                    ]
                    if cookie_file_path:
                        args.extend(["--cookies", cookie_file_path])
                    result = subprocess.run(args, capture_output=True, text=True, errors="ignore", timeout=120)
                    
                    if result.returncode != 0 and cookie_file_path:
                        logger.warning("CLI fallback download with cookies failed. Retrying fallback WITHOUT cookies...")
                        args = [
                            YTDLP_CMD,
                            "--ignore-config",
                            "-f", "bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best",
                            "--no-warnings",
                            "--no-check-certificate",
                            "--socket-timeout", "60",
                            "-o", os.path.join(temp_dir, "%(title)s.%(ext)s"),
                            url
                        ]
                        subprocess.run(args, capture_output=True, text=True, errors="ignore", timeout=120)
            
        # Clean up secure temp cookie file immediately
        if cookie_file_path and os.path.exists(cookie_file_path):
            os.unlink(cookie_file_path)
            
        downloaded_files = os.listdir(temp_dir)
        if not downloaded_files:
            raise Exception("Failed to download video file. Temp directory is empty.")
            
        file_path = os.path.join(temp_dir, downloaded_files[0])
        
        # Async cleanup task to delete temporary files once browser download finishes
        def cleanup_temp_dir(path_to_clean: str):
            try:
                import shutil
                shutil.rmtree(path_to_clean, ignore_errors=True)
                logger.info(f"Successfully cleaned up temporary directory: {path_to_clean}")
            except Exception as clean_err:
                logger.error(f"Error cleaning up temp directory: {clean_err}")
                
        background_tasks.add_task(cleanup_temp_dir, temp_dir)
        
        # Return highly efficient zero-memory FileResponse
        return FileResponse(
            path=file_path,
            filename=sanitized_title,
            media_type=content_type,
            background=background_tasks
        )
        
    except Exception as e:
        if cookie_file_path and os.path.exists(cookie_file_path):
            os.unlink(cookie_file_path)
        # Always clean up manually created directory on failure
        if os.path.exists(temp_dir):
            import shutil
            shutil.rmtree(temp_dir, ignore_errors=True)
        logger.error(f"Direct yt-dlp download failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("python.app:app", host="127.0.0.1", port=8000, reload=True)
