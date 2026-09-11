#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
======================================================================
 Broadcast Game - 다국어 번역 및 한글 누출 종합 검수 도구 (Audit Tool)
======================================================================

프로젝트 내 모든 다국어 리소스 및 소스코드에서:
  1. UI Locales (src/locales/*.json): 한글 잔존(미번역), 누락 키, 빈 값
  2. 이벤트/VN 대사 (public/chapter_assets/events/**/loc/*.json): 한글 잔존, 누락 키, 화자명
  3. 인게임 채팅 데이터 (src/data/chat/userChat.*.json): 한글 잔존, 누락 키
  4. SNS 게시글 데이터 (src/data/sns/*.txt): 비한국어 파일 내 한글 잔존
  5. 게임 코드 내 다국어 대사 (src/game/dateLines.ts 등): 다국어 필드 내 한글 잔존
  6. UI 소스코드 (src/**/*.tsx, ts): 하드코딩된 한글 (인게임 UI / 에디터 UI 분류)

사용법:
  python verify_translations.py
  python verify_translations.py --report report.md
  python verify_translations.py --category ui
  python verify_translations.py --category events
  python verify_translations.py --category code
  python verify_translations.py --detail
"""

import os
import sys
import json
import re
import glob
import argparse
from typing import Dict, List, Any, Tuple, Optional

# UTF-8 출력 보장
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(PROJECT_ROOT, "src")
LOCALES_DIR = os.path.join(SRC_DIR, "locales")
EVENTS_DIR = os.path.join(PROJECT_ROOT, "public", "chapter_assets", "events")
CHAT_DIR = os.path.join(SRC_DIR, "data", "chat")
SNS_DIR = os.path.join(SRC_DIR, "data", "sns")

# 한글 유니코드 정규식 (완성형 + 자모음)
HANGUL_REGEX = re.compile(r'[\uac00-\ud7a3\u1100-\u11ff\u3130-\u318f\ua960-\ua97f\ud7b0-\ud7ff]')

# 지원 언어 목록
UI_LANGS = ['EN', 'JA', 'ZH-CN', 'ZH-TW', 'RU', 'ES', 'DE']
EVENT_LANGS = ['en', 'ja', 'zh-cn', 'zh-tw', 'ru', 'es', 'de']
CHAT_LANGS = ['en', 'ja', 'zh', 'zh-tw', 'ru', 'es', 'de']
SNS_LANGS = ['en', 'ja', 'zh', 'zh-tw', 'ru', 'es', 'de']

PLAYER_TOKENS = {'사장', '사장님', '플레이어', 'player', 'producer', 'CEO', '사장(플레이어)', 'Player'}


def flatten_json(data: Any, prefix: str = '') -> Dict[str, Any]:
    """중첩된 JSON 딕셔너리를 평탄화(flatten)합니다."""
    items: Dict[str, Any] = {}
    if isinstance(data, dict):
        for k, v in data.items():
            curr = f"{prefix}.{k}" if prefix else k
            if isinstance(v, dict):
                items.update(flatten_json(v, curr))
            elif isinstance(v, list):
                for idx, item in enumerate(v):
                    items.update(flatten_json(item, f"{curr}[{idx}]"))
            else:
                items[curr] = v
    elif isinstance(data, list):
        for idx, item in enumerate(data):
            items.update(flatten_json(item, f"{prefix}[{idx}]"))
    else:
        items[prefix] = data
    return items


class AuditResult:
    def __init__(self):
        # 1. UI Locales
        self.ui_hangul_leaks: Dict[str, List[Tuple[str, str]]] = {lang: [] for lang in UI_LANGS}
        self.ui_missing_keys: Dict[str, List[str]] = {lang: [] for lang in UI_LANGS}
        self.ui_empty_keys: Dict[str, List[str]] = {lang: [] for lang in UI_LANGS}
        self.ui_total_keys: Dict[str, int] = {}
        
        # 2. Events / VN
        self.events_hangul_leaks: List[Dict[str, Any]] = []
        self.events_missing_keys: List[Dict[str, Any]] = []
        self.events_missing_files: List[Dict[str, Any]] = []
        self.events_speaker_korean: List[Dict[str, Any]] = []
        self.events_scanned_count: int = 0
        
        # 3. Chat
        self.chat_hangul_leaks: List[Dict[str, Any]] = []
        self.chat_missing_keys: List[Dict[str, Any]] = []
        
        # 4. SNS
        self.sns_hangul_leaks: List[Dict[str, Any]] = []
        
        # 5. Game Data / 대사
        self.game_dialogue_leaks: List[Dict[str, Any]] = []
        
        # 6. Source Code Hardcoded Korean
        self.code_korean_ingame: List[Dict[str, Any]] = []
        self.code_korean_editor: List[Dict[str, Any]] = []


def audit_ui_locales(result: AuditResult) -> None:
    """src/locales/*.json UI 다국어 번역 파일을 검수합니다."""
    ko_path = os.path.join(LOCALES_DIR, "KO.json")
    if not os.path.exists(ko_path):
        print(f"[경고] KO.json 파일이 존재하지 않습니다: {ko_path}")
        return

    try:
        ko_raw = json.load(open(ko_path, encoding='utf-8'))
        ko_flat = flatten_json(ko_raw)
        result.ui_total_keys['KO'] = len(ko_flat)
    except Exception as e:
        print(f"[오류] KO.json 파싱 실패: {e}")
        return

    for lang in UI_LANGS:
        lang_path = os.path.join(LOCALES_DIR, f"{lang}.json")
        if not os.path.exists(lang_path):
            result.ui_missing_keys[lang] = list(ko_flat.keys())
            result.ui_total_keys[lang] = 0
            continue

        try:
            lang_raw = json.load(open(lang_path, encoding='utf-8'))
            lang_flat = flatten_json(lang_raw)
            result.ui_total_keys[lang] = len(lang_flat)
        except Exception as e:
            print(f"[오류] {lang}.json 파싱 실패: {e}")
            continue

        # KO 키 대비 누락 및 빈 값 검사
        for k, ko_val in ko_flat.items():
            if k not in lang_flat:
                result.ui_missing_keys[lang].append(k)
            else:
                lang_val = lang_flat[k]
                if isinstance(lang_val, str):
                    if lang_val.strip() == "" and str(ko_val).strip() != "":
                        result.ui_empty_keys[lang].append(k)
                    elif HANGUL_REGEX.search(lang_val):
                        result.ui_hangul_leaks[lang].append((k, lang_val))


def audit_events(result: AuditResult) -> None:
    """public/chapter_assets/events/**/loc/*.json 이벤트 VN 대사를 검수합니다."""
    event_files = sorted(glob.glob(os.path.join(EVENTS_DIR, "*.json")))
    result.events_scanned_count = len(event_files)

    for event_file in event_files:
        event_id = os.path.splitext(os.path.basename(event_file))[0]
        loc_dir = os.path.join(EVENTS_DIR, event_id, "loc")

        try:
            event_data = json.load(open(event_file, encoding='utf-8'))
        except Exception:
            event_data = {}

        # 1) 이벤트 노드 내 화자명(speaker) 한국어 하드코딩 검사
        def walk_nodes(nodes):
            for n in nodes or []:
                if isinstance(n, dict):
                    yield n
                    if isinstance(n.get('nodes'), list):
                        yield from walk_nodes(n['nodes'])

        for node in walk_nodes(event_data.get('nodes', [])):
            if node.get('type') in ('graphic', 'fade', 'sound', 'pause', 'image', 'video'):
                continue
            if node.get('speakerType') == 'character':
                sp = str(node.get('speaker') or node.get('character') or node.get('char') or '').strip()
                base_sp = sp.split('(')[0].strip()
                if HANGUL_REGEX.search(sp) and sp not in PLAYER_TOKENS and base_sp not in PLAYER_TOKENS:
                    result.events_speaker_korean.append({
                        'eventId': event_id,
                        'nodeId': node.get('id'),
                        'textKey': node.get('text_key'),
                        'speaker': sp,
                    })

        # 2) loc 파일 검수
        if not os.path.isdir(loc_dir):
            continue

        ko_loc_path = os.path.join(loc_dir, "ko.json")
        if not os.path.exists(ko_loc_path):
            continue

        try:
            ko_loc = json.load(open(ko_loc_path, encoding='utf-8'))
        except Exception:
            ko_loc = {}

        for lang in EVENT_LANGS:
            lang_loc_path = os.path.join(loc_dir, f"{lang}.json")
            if not os.path.exists(lang_loc_path):
                result.events_missing_files.append({
                    'eventId': event_id,
                    'lang': lang,
                })
                continue

            try:
                lang_loc = json.load(open(lang_loc_path, encoding='utf-8'))
            except Exception:
                lang_loc = {}

            for key, ko_text in ko_loc.items():
                if not isinstance(ko_text, str) or not ko_text.strip():
                    continue
                lang_text = lang_loc.get(key)
                if lang_text is None or (isinstance(lang_text, str) and lang_text.strip() == ""):
                    result.events_missing_keys.append({
                        'eventId': event_id,
                        'lang': lang,
                        'key': key,
                        'koText': ko_text,
                    })
                elif isinstance(lang_text, str) and HANGUL_REGEX.search(lang_text):
                    result.events_hangul_leaks.append({
                        'eventId': event_id,
                        'lang': lang,
                        'key': key,
                        'text': lang_text,
                    })


def audit_chat_and_sns(result: AuditResult) -> None:
    """src/data/chat 및 src/data/sns 내의 번역 데이터를 검수합니다."""
    # Chat 검수
    ko_chat_path = os.path.join(CHAT_DIR, "userChat.ko.json")
    ko_chat_keys = set()
    if os.path.exists(ko_chat_path):
        try:
            ko_chat_data = json.load(open(ko_chat_path, encoding='utf-8'))
            ko_chat_keys = set(ko_chat_data.keys()) if isinstance(ko_chat_data, dict) else set()
        except Exception:
            pass

    for lang in CHAT_LANGS:
        chat_path = os.path.join(CHAT_DIR, f"userChat.{lang}.json")
        if not os.path.exists(chat_path):
            continue
        try:
            chat_data = json.load(open(chat_path, encoding='utf-8'))
            if isinstance(chat_data, dict):
                for k, v in chat_data.items():
                    if isinstance(v, str) and HANGUL_REGEX.search(v):
                        result.chat_hangul_leaks.append({'lang': lang, 'key': k, 'text': v})
                for k in ko_chat_keys:
                    if k not in chat_data or not str(chat_data[k]).strip():
                        result.chat_missing_keys.append({'lang': lang, 'key': k})
        except Exception:
            pass

    # SNS 검수
    sns_files = glob.glob(os.path.join(SNS_DIR, "*.txt"))
    for sf in sns_files:
        fname = os.path.basename(sf)
        if fname in ['S1.txt', 'S2.txt', 'S3.txt', 'line.txt', 'XUserID.txt']:
            continue
        try:
            content = open(sf, encoding='utf-8').read()
            if HANGUL_REGEX.search(content):
                lines = content.splitlines()
                for idx, line in enumerate(lines, 1):
                    if HANGUL_REGEX.search(line):
                        result.sns_hangul_leaks.append({
                            'file': fname,
                            'line': idx,
                            'text': line.strip()
                        })
        except Exception:
            pass


def audit_game_dialogues(result: AuditResult) -> None:
    """src/game/ 디렉터리 내의 다국어 정의 파일(dateLines, donationLines 등)을 검수합니다."""
    game_dir = os.path.join(SRC_DIR, "game")
    target_files = [
        "dateLines.ts", "donationLines.ts", "judgeDialogues.ts",
        "promotionLines.ts", "proposalLines.ts", "specialVacationLines.ts",
        "vipLines.ts"
    ]

    for fname in target_files:
        fpath = os.path.join(game_dir, fname)
        if not os.path.exists(fpath):
            continue
        lines = open(fpath, encoding='utf-8').readlines()
        for idx, line in enumerate(lines, 1):
            sline = line.strip()
            # line(...) 호출 또는 객체 필드 검사
            for lang_key in ["ja:", "en:", "'zh-cn':", "'zh-tw':", "ru:", "es:", "de:"]:
                if lang_key in sline:
                    after_key = sline.split(lang_key, 1)[1]
                    match = re.search(r"['\"`](.*?)['\"`]", after_key)
                    if match:
                        val = match.group(1)
                        if HANGUL_REGEX.search(val):
                            result.game_dialogue_leaks.append({
                                'file': fname,
                                'line': idx,
                                'field': lang_key.replace(":", "").strip("'"),
                                'text': val
                            })


def audit_source_code(result: AuditResult) -> None:
    """src/ 소스코드(.ts, .tsx) 내 하드코딩된 한글 문자열을 검수합니다."""
    editor_keywords = ['Editor', 'Panel', 'Simulator', 'Manage', 'Tool', 'debug', 'Admin']
    
    for root, dirs, files in os.walk(SRC_DIR):
        if 'locales' in root or 'generated' in root:
            continue
        for f in files:
            if not (f.endswith('.ts') or f.endswith('.tsx')):
                continue
            fpath = os.path.join(root, f)
            rel_path = os.path.relpath(fpath, PROJECT_ROOT).replace('\\', '/')
            
            if os.path.basename(fpath) in [
                "dateLines.ts", "donationLines.ts", "judgeDialogues.ts",
                "promotionLines.ts", "proposalLines.ts", "specialVacationLines.ts",
                "vipLines.ts", "characterLocales.ts", "characters.ts"
            ]:
                continue

            try:
                lines = open(fpath, encoding='utf-8', errors='ignore').readlines()
            except Exception:
                continue

            in_multiline_comment = False
            for idx, line in enumerate(lines, 1):
                sline = line.strip()
                if sline.startswith('/*') and '*/' in sline:
                    continue
                if sline.startswith('/*'):
                    in_multiline_comment = True
                    continue
                if in_multiline_comment:
                    if '*/' in sline:
                        in_multiline_comment = False
                    continue
                if sline.startswith('//') or sline.startswith('*'):
                    continue

                code_part = line.split('//')[0]
                if HANGUL_REGEX.search(code_part):
                    if re.search(r'console\.(log|warn|error|info|debug)\(', code_part):
                        continue
                    
                    item = {
                        'file': rel_path,
                        'line': idx,
                        'code': code_part.strip()
                    }
                    if any(k in f for k in editor_keywords):
                        result.code_korean_editor.append(item)
                    else:
                        result.code_korean_ingame.append(item)


def print_summary(result: AuditResult) -> None:
    """검수 결과를 콘솔에 표 형태로 요약 출력합니다."""
    print("=" * 80)
    print("                 🎮 Broadcast Game 다국어 번역 종합 검수 결과")
    print("=" * 80)

    # 1. UI Locales
    print("\n[1] UI 다국어 번역 (src/locales/*.json)")
    print("-" * 80)
    print(f"{'언어':<10} | {'총 키 수':<10} | {'한글 잔존(미번역)':<18} | {'누락 키(Missing)':<16} | {'빈 값(Empty)':<12}")
    print("-" * 80)
    print(f"{'KO (기준)':<10} | {result.ui_total_keys.get('KO', 0):<10} | {'-':<18} | {'-':<16} | {'-':<12}")
    for lang in UI_LANGS:
        total = result.ui_total_keys.get(lang, 0)
        hangul = len(result.ui_hangul_leaks[lang])
        missing = len(result.ui_missing_keys[lang])
        empty = len(result.ui_empty_keys[lang])
        status = "⚠️" if (hangul > 0 or missing > 0 or empty > 0) else "✅"
        print(f"{lang:<10} | {total:<10} | {hangul:<18} | {missing:<16} | {empty:<12} {status}")

    # 2. Events
    print("\n[2] 이벤트 / VN 대사 (public/chapter_assets/events)")
    print("-" * 80)
    print(f"- 스캔된 이벤트 수: {result.events_scanned_count}개")
    print(f"- 누락된 언어 파일: {len(result.events_missing_files)}건 {'⚠️' if result.events_missing_files else '✅'}")
    print(f"- 대사 한글 잔존:   {len(result.events_hangul_leaks)}건 {'⚠️' if result.events_hangul_leaks else '✅'}")
    print(f"- 대사 번역 누락:   {len(result.events_missing_keys)}건 {'⚠️' if result.events_missing_keys else '✅'}")
    print(f"- 화자명 한국어:    {len(result.events_speaker_korean)}건 {'⚠️' if result.events_speaker_korean else '✅'}")

    # 3. Chat & SNS
    print("\n[3] 인게임 채팅 & SNS 데이터 (src/data/chat, src/data/sns)")
    print("-" * 80)
    print(f"- 채팅 한글 잔존:   {len(result.chat_hangul_leaks)}건 {'⚠️' if result.chat_hangul_leaks else '✅'}")
    print(f"- 채팅 키 누락:     {len(result.chat_missing_keys)}건 {'⚠️' if result.chat_missing_keys else '✅'}")
    print(f"- SNS 한글 잔존:    {len(result.sns_hangul_leaks)}건 {'⚠️' if result.sns_hangul_leaks else '✅'}")

    # 4. Game Dialogues
    print("\n[4] 코드 내 다국어 대사 필드 (src/game/*Lines.ts)")
    print("-" * 80)
    print(f"- 비한국어 대사 내 한글 잔존: {len(result.game_dialogue_leaks)}건 {'⚠️' if result.game_dialogue_leaks else '✅'}")

    # 5. Source Code Hardcoded
    print("\n[5] 소스코드 내 하드코딩된 한글 (src/**/*.tsx, .ts)")
    print("-" * 80)
    print(f"- 인게임 플레이 화면 코드: {len(result.code_korean_ingame)}줄")
    print(f"- 에디터/관리자 툴 화면:  {len(result.code_korean_editor)}줄")
    print("=" * 80)


def generate_markdown_report(result: AuditResult, report_path: str) -> None:
    """마크다운 형식의 상세 검수 리포트 파일을 생성합니다."""
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write("# 📋 Broadcast Game 다국어 번역 및 한글 누출 종합 검수 보고서\n\n")
        f.write(f"> **검수 일시**: 2026-09-12\n")
        f.write(f"> **프로젝트 경로**: `{PROJECT_ROOT}`\n\n")

        f.write("## 1. 종합 검수 요약\n\n")
        f.write("| 영역 | 검수 항목 | 발견 건수 | 상태 |\n")
        f.write("|---|---|---|---|\n")
        
        # UI
        total_ui_issues = sum(len(result.ui_hangul_leaks[l]) + len(result.ui_missing_keys[l]) + len(result.ui_empty_keys[l]) for l in UI_LANGS)
        f.write(f"| **UI 번역 (src/locales)** | 한글 잔존 / 누락 / 빈 값 | {total_ui_issues}건 | {'⚠️ 보수 필요' if total_ui_issues > 0 else '✅ 정상'} |\n")
        
        # Events
        total_event_issues = len(result.events_missing_files) + len(result.events_hangul_leaks) + len(result.events_missing_keys) + len(result.events_speaker_korean)
        f.write(f"| **이벤트 VN 대사** | 언어파일 누락 / 한글 잔존 / 미번역 / 화자명 | {total_event_issues}건 | {'⚠️ 보수 필요' if total_event_issues > 0 else '✅ 정상'} |\n")
        
        # Chat & SNS
        total_chat_sns = len(result.chat_hangul_leaks) + len(result.chat_missing_keys) + len(result.sns_hangul_leaks)
        f.write(f"| **채팅 & SNS 데이터** | 한글 잔존 / 누락 키 | {total_chat_sns}건 | {'⚠️ 보수 필요' if total_chat_sns > 0 else '✅ 정상'} |\n")
        
        # Game Dialogues
        f.write(f"| **코드 내 대사 데이터** | 비한국어 필드 내 한글 잔존 | {len(result.game_dialogue_leaks)}건 | {'⚠️ 보수 필요' if result.game_dialogue_leaks else '✅ 정상'} |\n")
        
        # Ingame Code
        f.write(f"| **인게임 소스코드** | 하드코딩된 한글 문자열 | {len(result.code_korean_ingame)}줄 | {'⚠️ i18n 적용 권장' if result.code_korean_ingame else '✅'} |\n\n")

        # ------------------------------------------------------------------
        # 2. UI 번역 상세
        f.write("## 2. UI 번역 리소스 검수 상세 (`src/locales/*.json`)\n\n")
        f.write("| 언어 | 총 키 수 | 한글 잔존(미번역) | 누락 키(Missing) | 빈 값(Empty) |\n")
        f.write("|---|---|---|---|---|\n")
        f.write(f"| **KO (기준)** | {result.ui_total_keys.get('KO', 0)} | - | - | - |\n")
        for lang in UI_LANGS:
            f.write(f"| **{lang}** | {result.ui_total_keys.get(lang, 0)} | {len(result.ui_hangul_leaks[lang])}건 | {len(result.ui_missing_keys[lang])}건 | {len(result.ui_empty_keys[lang])}건 |\n")
        f.write("\n")

        # 한글 잔존 상세
        has_ui_leaks = any(len(result.ui_hangul_leaks[l]) > 0 for l in UI_LANGS)
        if has_ui_leaks:
            f.write("### 2.1. UI 언어 파일 내 한글 잔존(미번역) 키 목록\n\n")
            for lang in UI_LANGS:
                leaks = result.ui_hangul_leaks[lang]
                if leaks:
                    f.write(f"#### 🌐 `{lang}.json` ({len(leaks)}건)\n\n")
                    f.write("| 키 경로 | 현재 값 (한국어) |\n")
                    f.write("|---|---|\n")
                    for k, val in leaks:
                        f.write(f"| `{k}` | `{val}` |\n")
                    f.write("\n")

        # 누락 키 상세
        has_ui_missing = any(len(result.ui_missing_keys[l]) > 0 for l in UI_LANGS)
        if has_ui_missing:
            f.write("### 2.2. UI 언어 파일 내 누락(Missing) 키 목록\n\n")
            for lang in UI_LANGS:
                missing = result.ui_missing_keys[lang]
                if missing:
                    f.write(f"#### 🌐 `{lang}.json` 누락 키 ({len(missing)}건)\n\n")
                    for k in missing:
                        f.write(f"- `{k}`\n")
                    f.write("\n")

        # ------------------------------------------------------------------
        # 3. 이벤트 VN 상세
        f.write("## 3. 이벤트 / VN 대사 검수 상세 (`public/chapter_assets/events`)\n\n")
        if result.events_missing_files:
            f.write("### 3.1. 누락된 이벤트 언어 파일\n\n")
            for item in result.events_missing_files:
                f.write(f"- 이벤트 ID: `{item['eventId']}` → 누락 파일: `{item['lang']}.json`\n")
            f.write("\n")

        if result.events_hangul_leaks:
            f.write("### 3.2. 이벤트 타겟 언어 내 한글 잔존 대사\n\n")
            for item in result.events_hangul_leaks:
                f.write(f"- **이벤트**: `{item['eventId']}` | **언어**: `{item['lang']}` | **키**: `{item['key']}`\n")
                f.write(f"  - 본문: `{item['text']}`\n")
            f.write("\n")

        if result.events_missing_keys:
            f.write(f"### 3.3. 이벤트 미번역/누락 키 ({len(result.events_missing_keys)}건)\n\n")
            for item in result.events_missing_keys[:20]:
                f.write(f"- `{item['eventId']}` [{item['lang']}] 키: `{item['key']}` (KO: `{item['koText']}`)\n")
            if len(result.events_missing_keys) > 20:
                f.write(f"- ... 외 {len(result.events_missing_keys) - 20}건 생략\n")
            f.write("\n")

        # ------------------------------------------------------------------
        # 4. 인게임 소스코드 내 한글 하드코딩
        f.write("## 4. 인게임 소스코드 내 하드코딩된 한글 (`src/**/*.tsx`, `.ts`)\n\n")
        f.write("> **참고**: 에디터/관리자 툴 전용 화면은 제외하고, 실제 플레이어에게 노출될 수 있는 인게임 UI 소스코드입니다.\n\n")
        
        grouped: Dict[str, List[Dict[str, Any]]] = {}
        for item in result.code_korean_ingame:
            grouped.setdefault(item['file'], []).append(item)

        for file_path, items in sorted(grouped.items(), key=lambda x: len(x[1]), reverse=True):
            f.write(f"### 📄 `{file_path}` ({len(items)}건)\n\n")
            f.write("| 라인 | 코드 스니펫 |\n")
            f.write("|---|---|\n")
            for it in items[:15]:
                safe_code = it['code'].replace('|', '\\|').replace('\n', ' ')
                f.write(f"| {it['line']} | `{safe_code[:80]}` |\n")
            if len(items) > 15:
                f.write(f"| ... | *외 {len(items) - 15}건 생략* |\n")
            f.write("\n")


def main():
    parser = argparse.ArgumentParser(description="Broadcast Game 다국어 번역 및 한글 누출 검수 도구")
    parser.add_argument("--report", type=str, default="TRANSLATION_AUDIT_REPORT.md", help="리포트 저장 경로 (기본: TRANSLATION_AUDIT_REPORT.md)")
    parser.add_argument("--category", type=str, choices=["all", "ui", "events", "chat", "sns", "code"], default="all", help="검수할 카테고리")
    parser.add_argument("--detail", action="store_true", help="터미널에 세부 목록까지 모두 출력")
    args = parser.parse_args()

    result = AuditResult()

    if args.category in ["all", "ui"]:
        audit_ui_locales(result)
    if args.category in ["all", "events"]:
        audit_events(result)
    if args.category in ["all", "chat", "sns"]:
        audit_chat_and_sns(result)
    if args.category in ["all"]:
        audit_game_dialogues(result)
    if args.category in ["all", "code"]:
        audit_source_code(result)

    print_summary(result)

    if args.report:
        generate_markdown_report(result, args.report)
        print(f"\n✨ 상세 검수 보고서가 생성되었습니다: {args.report}")


if __name__ == "__main__":
    main()
