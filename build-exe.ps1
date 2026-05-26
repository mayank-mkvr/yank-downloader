$env:Path = "C:\Program Files\nodejs;$env:Path"
cd h:\ytdownloader
& npx pkg . --targets win-x64 --output dist/ytdownloader.exe --compress Brotli
