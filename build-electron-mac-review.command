#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"

echo "==================================================="
echo " [macOS Review Build] 심사용 올오픈 빌드"
echo " - 전 캐릭터 보유 / S등급 / 최대 스탯"
echo " - 자금 \$5,000,000 / H씬·업적 전부 해금"
echo "==================================================="
echo

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "[ERROR] 이 스크립트는 macOS에서만 실행할 수 있습니다."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js가 필요합니다. https://nodejs.org 에서 설치하세요."
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "[info] node_modules 없음 → npm install 실행"
  npm install
fi

npm run build:electron:mac:review

echo
echo "==================================================="
echo " [macOS Review Build] 완료"
echo " 출력: dist-electron-mac-review"
echo "==================================================="

if [[ -d "dist-electron-mac-review" ]]; then
  open "dist-electron-mac-review"
fi

read -r -p "Press Enter to close..."
