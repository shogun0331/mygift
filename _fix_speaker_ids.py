# -*- coding: utf-8 -*-
"""이벤트 json의 character 화자가 한국어 리터럴(아야/메구미/마이/리나 등)로 박혀 있어서
전역 캐릭터 이름 로컬라이즈(characterDisplayName)로 안 풀리는 문제 수정.
→ 각 이벤트의 ownerCharacterId 로 그 화자 토큰을 치환한다.
   (ownerCharacterId == characters.json 의 캐릭터 id 이므로 런타임에 전역 캐릭터로 매칭됨)"""
import json, os, re, glob, shutil, datetime

ROOT = r"F:/Broadcast/broadcast-game/public/chapter_assets/events"
HG = re.compile(r'[가-힣ㄱ-ㅎㅏ-ㅣ]')
PLAYER = {'사장', '사장님', '플레이어', 'player', 'producer', 'CEO', 'VIP'}
# 알려진 캐릭터 이름(성+이름/이름/성) — owner 매칭을 위해 참조용
KNOWN_NAMES = {'시라카와 아야', '아야', '사토 메구미', '메구미', '타치바나 미사키', '미사키',
               '아키야마 미호', '미호', '사쿠라기 마이', '마이', '미야자와 리나', '미야자와', '리나',
               '센노 리나', '루이자', '리메이'}

def walk(nodes):
    for n in nodes or []:
        if isinstance(n, dict):
            yield n
            if isinstance(n.get('nodes'), list):
                yield from walk(n['nodes'])

bakdir = os.path.join(os.path.dirname(ROOT), "speaker_fix_backup_" + datetime.datetime.now().strftime('%Y%m%d_%H%M%S'))
os.makedirs(bakdir, exist_ok=True)
changed_events, total_repl = [], 0

for base in glob.glob(ROOT + '/*.json'):
    name = os.path.splitext(os.path.basename(base))[0]
    try:
        b = json.load(open(base, encoding='utf-8'))
    except Exception:
        continue
    owner = b.get('ownerCharacterId')
    if not owner:
        continue
    repl = 0
    for n in walk(b.get('nodes', [])):
        if n.get('speakerType') != 'character':
            continue
        # 화자 후보 필드에서 한국어 리터럴 찾기
        for f in ('speaker', 'character', 'character_id', 'char'):
            v = n.get(f)
            if not isinstance(v, str):
                continue
            s = v.strip()
            if not s or not HG.search(s):
                continue
            base_tok = s.split('(')[0].strip()
            if base_tok in PLAYER or s in PLAYER:
                continue
            if base_tok in KNOWN_NAMES or s in KNOWN_NAMES:
                if s != owner:
                    n[f] = owner
                    repl += 1
    if repl:
        shutil.copy2(base, os.path.join(bakdir, name + '.json'))
        json.dump(b, open(base, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        changed_events.append((name, repl))
        total_repl += repl

print(f"치환된 이벤트: {len(changed_events)}, 총 치환 수: {total_repl}")
for nm, r in changed_events:
    print(f"  {nm}: {r}개 화자 -> ownerCharacterId")
print(f"백업: {bakdir}")
