#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
broadcast-game 이벤트 한국어 누출 전수 검사기
=============================================
위치: F:/Broadcast/broadcast-game/public/chapter_assets/events

게임 VN 렌더링은 대사/선택지/이름을 lookupLocalizedString 으로 해석하고,
요청 언어(lang) 값이 비어있거나 없으면 무조건 ko(한국어)로 폴백한다
(src/events/eventLocales.ts, src/events/EventSimulator.tsx, src/game/shortsVnDialogue.ts).

따라서 "한국어가 다른 언어 화면에 새어나오는" 조건 = 아래 3가지 중 하나:
  A) [빈번역 누출]  ko에 한국어 번역이 차 있는 키인데, lang(L) loc 파일 값이
                    빈 문자열이거나 아예 없음  -> L 화면에 ko 한국어가 그대로 표시.
  B) [한국어 직접 저장] lang(L) loc 파일 값 자체에 한글이 들어있음(미번역 상태로 저장).
  C) [화자 이름]      character 노드의 speaker 가 한국어 리터럴(예: '아야','마이')이라
                    이름 로컬라이즈가 안 되면 항상 한국어 이름이 표시.
                    (단 사장/사장님/플레이어는 Player로 매핑되므로 제외)

용법:  python scan_event_korean.py [--report 경로]
"""
import json, os, re, sys, glob

ROOT = r"F:/Broadcast/broadcast-game/public/chapter_assets/events"
LANGS = ['en', 'ja', 'zh-cn', 'ru', 'es', 'de']
ALL = ['ko'] + LANGS
HANGUL = re.compile(r'[가-힣ㄱ-ㅎㅏ-ㅣ]')
# 코드상 Player로 매핑되어 노출되지 않는 한국어 화자 토큰
PLAYER_TOKENS = {'사장', '사장님', '플레이어', 'player', 'producer', 'CEO', '사장(플레이어)'}

def load(locdir, lang):
    f = os.path.join(locdir, lang + '.json')
    if os.path.exists(f):
        try:
            return json.load(open(f, encoding='utf-8'))
        except Exception:
            return {}
    return None  # 파일 자체가 없음

def lookup(maps, lang, keys):
    """eventLocales.lookupLocalizedString 흉내 (lang -> ko 폴백)."""
    for locale in [lang, 'ko']:
        m = maps.get(locale) or {}
        for k in keys:
            if not k: continue
            v = m.get(k)
            if isinstance(v, str) and v.strip():
                return v
    return ''

def node_text_keys(n):
    return [n.get('text_key'), n.get('dialogue_key'), n.get('key'),
            n.get('id'), n.get('message_key'), n.get('dialogue'), n.get('text')]

def walk(nodes):
    for n in nodes or []:
        if isinstance(n, dict):
            yield n
            if isinstance(n.get('nodes'), list):
                yield from walk(n['nodes'])

def main():
    report_path = None
    if len(sys.argv) > 1 and sys.argv[1] == '--report' and len(sys.argv) > 2:
        report_path = sys.argv[2]

    all_events = sorted(glob.glob(ROOT + '/*.json'))
    out = []
    totals = {'A': 0, 'B': 0, 'C': 0}

    for base_p in all_events:
        name = os.path.splitext(os.path.basename(base_p))[0]
        locdir = os.path.join(ROOT, name, 'loc')
        if not os.path.isdir(locdir):
            continue
        try:
            b = json.load(open(base_p, encoding='utf-8'))
        except Exception:
            continue
        title = b.get('title') or name
        maps = {}
        for L in ALL:
            maps[L] = load(locdir, L)
        missing_files = [L for L in ALL if maps[L] is None]

        rowsA, rowsB, rowsC = [], [], []
        # C: 화자 이름 한국어
        for n in walk(b.get('nodes', [])):
            if n.get('type') in ('graphic', 'fade', 'sound', 'pause', 'image', 'video'):
                continue
            st = n.get('speakerType')
            if st == 'character':
                sp = str(n.get('speaker') or n.get('character') or n.get('char') or '').strip()
                base = sp.split('(')[0].strip()
                if HANGUL.search(sp) and sp not in PLAYER_TOKENS and base not in PLAYER_TOKENS:
                    rowsC.append((n.get('id'), n.get('text_key'), sp))

            keys = node_text_keys(n)
            # 대사/선택지 본문 키별 누출 (A, B)
            ko_val = lookup(maps, 'ko', keys)
            has_ko = bool(ko_val and HANGUL.search(ko_val))
            for L in LANGS:
                if maps[L] is None:
                    continue
                l_val = lookup(maps, L, keys)
                # l_val이 비었거나 ko로 폴백됐는데 그게 한국어면 A
                if has_ko and (not l_val or l_val == ko_val):
                    # L loc에 해당 키가 "빈 문자열로 존재"하는지/없는지 구분
                    present_empty = False
                    for k in keys:
                        if not k: continue
                        v = maps[L].get(k)
                        if v == '' :
                            present_empty = True; break
                    reason = 'EMPTY' if present_empty else 'MISSING'
                    rowsA.append((L, reason, n.get('text_key') or n.get('id'), ko_val))
                # B: L loc 값 자체에 한국어(직접 저장)
                if l_val and l_val != ko_val and HANGUL.search(l_val):
                    rowsB.append((L, n.get('text_key') or n.get('id'), l_val))

        # 중복(같은 키·같은 언어) 제거
        def dedup(rows):
            seen, out2 = set(), []
            for r in rows:
                k = (r[0], r[2])
                if k in seen: continue
                seen.add(k); out2.append(r)
            return out2
        rowsA = dedup(rowsA); rowsB = dedup(rowsB)

        # C 화자 이름도 (이벤트, 이름) 기준으로 집계
        names = sorted({r[2] for r in rowsC})
        totals['A'] += len(rowsA); totals['B'] += len(rowsB); totals['C'] += len(rowsC)
        if rowsA or rowsB or rowsC or missing_files:
            out.append((name, title, rowsA, rowsB, names, missing_files))

    # ===== 콘솔 요약 =====
    print(f"총 이벤트: {len(all_events)}")
    print(f"A(ko차있는데 L빈번역→폴백)={totals['A']}  B(L loc에 한국어 직접)={totals['B']}  C(한국어 화자이름)={totals['C']}")
    print()
    print(f"{'이벤트':38}{'제목':22}{'A':>4}{'B':>3}{'C(이름수)':>8}")
    for name, title, a, b, names, mf in out:
        flag = ' ★파일없음:' + ','.join(mf) if mf else ''
        print(f"{name[:38]:38}{str(title)[:22]:22}{len(a):>4}{len(b):>3}{len(names):>8}{flag}")
    print("\nC(한국어 화자이름) 전체 목록:")
    for name, title, a, b, names, mf in out:
        if names:
            print(f"  {name}: {', '.join(names)}")

    # ===== 상세 파일 저장 =====
    if report_path:
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("broadcast-game 이벤트 한국어 누출 검사 리포트\n")
            f.write(f"총 이벤트 {len(all_events)} | A={totals['A']} B={totals['B']} C={totals['C']}\n")
            f.write("=" * 70 + "\n\n")
            for name, title, a, b, names, mf in out:
                f.write(f"### {name}  ({title})\n")
                if mf:
                    f.write(f"  [경고] loc 파일 누락: {', '.join(mf)}\n")
                for L, reason, key, val in a:
                    f.write(f"  [A:{reason}] lang={L:6} key={key}\n            ko번역→ 폴백표시: {val}\n")
                for L, key, val in b:
                    f.write(f"  [B] lang={L:6} key={key}\n            L값(한국어직접): {val}\n")
                if names:
                    f.write(f"  [C] 한국어 화자이름: {', '.join(names)}\n")
                f.write("\n")
        print(f"\n상세 리포트 저장: {report_path}")

if __name__ == '__main__':
    main()
