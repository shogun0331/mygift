#!/bin/zsh
cd "$(dirname "$0")"

echo "========================================"
echo " broadcast-game - DEV MODE"
echo "========================================"
echo

# Finder에서 실행하면 PATH가 비어 있을 수 있음
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.local/bin:$PATH"

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  source "$HOME/.nvm/nvm.sh"
elif [[ -s "/opt/homebrew/opt/nvm/nvm.sh" ]]; then
  source "/opt/homebrew/opt/nvm/nvm.sh"
fi

if command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env)"
fi

if [[ -s "$HOME/.volta/bin/volta" ]]; then
  export PATH="$HOME/.volta/bin:$PATH"
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] npm을 찾을 수 없습니다. Node.js를 설치한 뒤 다시 실행하세요."
  echo
  read -r "?아무 키나 누르면 종료합니다..."
  exit 1
fi

# Windows에서 복사한 node_modules는 실행 비트가 빠져 있음
if [[ -d node_modules/.bin ]]; then
  chmod +x node_modules/.bin/* 2>/dev/null
fi

electron_bin="node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
if [[ ! -x "$electron_bin" ]]; then
  echo "macOS용 Electron이 없습니다. 다운로드합니다..."
  echo
  if [[ ! -d node_modules/electron ]]; then
    npm install
    install_code=$?
  else
    rm -rf node_modules/electron/dist node_modules/electron/path.txt
    node node_modules/electron/install.js
    install_code=$?
  fi
  if [[ $install_code -ne 0 || ! -x "$electron_bin" ]]; then
    echo
    echo "[ERROR] Electron 설치 실패. 프로젝트 폴더에서 npm install 후 다시 실행하세요."
    echo
    read -r "?아무 키나 누르면 종료합니다..."
    exit 1
  fi
  echo
fi

# Finder에서 받은 앱이 Gatekeeper에 막히지 않게 검역 속성 제거
xattr -cr node_modules/electron/dist/Electron.app 2>/dev/null

# 이전 Vite가 5173을 붙잡고 있으면 새 서버가 안 뜸
if pids=$(lsof -tiTCP:5173 -sTCP:LISTEN 2>/dev/null); then
  if [[ -n "$pids" ]]; then
    echo "포트 5173을 쓰던 이전 개발 서버를 종료합니다..."
    echo "$pids" | xargs kill 2>/dev/null
    sleep 1
    if pids=$(lsof -tiTCP:5173 -sTCP:LISTEN 2>/dev/null); then
      echo "$pids" | xargs kill -9 2>/dev/null
      sleep 0.5
    fi
  fi
fi

echo "Starting Vite + Electron..."
echo "이 창에서 Ctrl+C 를 누르면 종료됩니다."
echo

npm run dev
exit_code=$?

if [[ $exit_code -ne 0 ]]; then
  echo
  echo "[ERROR] 실행에 실패했습니다. (exit $exit_code)"
fi

echo
read -r "?아무 키나 누르면 종료합니다..."
exit $exit_code
