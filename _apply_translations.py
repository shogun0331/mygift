# -*- coding: utf-8 -*-
"""_fill_translations.TRANS 를 이용해 이벤트 loc 파일의 빈('')/누락 번역을 채운다."""
import json, os, re, glob, shutil, datetime, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from _fill_translations import TRANS

ROOT = r"F:/Broadcast/broadcast-game/public/chapter_assets/events"
LANGS = ['en', 'ja', 'zh-cn', 'ru', 'es', 'de']
HG = re.compile(r'[가-힣ㄱ-ㅎㅏ-ㅣ]')

# 1) 커버리지 사전검증: 실제 빈 누출 문장이 TRANS에 전부 있는지
need = set()
for base in glob.glob(ROOT + '/*.json'):
    name = os.path.splitext(os.path.basename(base))[0]
    kof = os.path.join(ROOT, name, 'loc', 'ko.json')
    if not os.path.exists(kof):
        continue
    ko = json.load(open(kof, encoding='utf-8'))
    for k, v in ko.items():
        if isinstance(v, str) and v.strip() and HG.search(v):
            # 비어있는 non-ko loc만 대상
            for L in LANGS:
                lf = os.path.join(ROOT, name, 'loc', L + '.json')
                if os.path.exists(lf):
                    d = json.load(open(lf, encoding='utf-8'))
                    cur = d.get(k, '')
                    if cur in (None, '',):
                        need.add(v.strip())

missing = [s for s in need if s not in TRANS]
print(f"채워야 할(빈) 고유 한국어 문장: {len(need)} | TRANS 커버: {len(need)-len(missing)} | 누락: {len(missing)}")
for s in missing[:20]:
    print("  누락:", s[:60])
if missing:
    sys.exit("누락 항목 존재 — 중단(커버리지 불일치).")

# 2) 백업 + 적용
bakdir = os.path.join(os.path.dirname(ROOT), "loc_backup_" + datetime.datetime.now().strftime('%Y%m%d_%H%M%S'))
os.makedirs(bakdir, exist_ok=True)
changed_files = []
filled = 0
for base in glob.glob(ROOT + '/*.json'):
    name = os.path.splitext(os.path.basename(base))[0]
    kof = os.path.join(ROOT, name, 'loc', 'ko.json')
    if not os.path.exists(kof):
        continue
    ko = json.load(open(kof, encoding='utf-8'))
    for L in LANGS:
        lf = os.path.join(ROOT, name, 'loc', L + '.json')
        if not os.path.exists(lf):
            continue
        d = json.load(open(lf, encoding='utf-8'))
        mod = False
        for k, v in ko.items():
            if not (isinstance(v, str) and v.strip() and HG.search(v)):
                continue
            cur = d.get(k)
            if cur in (None, '',) and v.strip() in TRANS:
                d[k] = TRANS[v.strip()][L]
                filled += 1
                mod = True
        if mod:
            # 백업
            rel = os.path.relpath(lf, os.path.dirname(ROOT))
            shutil.copy2(lf, os.path.join(bakdir, rel.replace('/', '_').replace('\\', '_')))
            json.dump(d, open(lf, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
            changed_files.append(lf)
print(f"\n채운 빈 값 수: {filled}")
print(f"수정된 loc 파일 수: {len(changed_files)}")
print(f"백업 폴더: {bakdir}")
