import json, os
from PIL import Image
import simpligen_pipeline as sp

BASE = r'F:/Broadcast/broadcast-game'
jobs = json.load(open(os.path.join(BASE, '_char_icons.json'), encoding='utf-8'))
for j in jobs:
    j['resultPath'] = sp.sg_job(j['jobId']).get('resultPath')

# 미호 최신본 교체
MIHO = {
    'icon': r'F:/Ai/Simpligen/output/df/community--anima-anime-packanima-base-v1/2026-08-29_00034_.png',
    'art': r'F:/Ai/Simpligen/output/df/community--anima-anime-packanima-base-v1/2026-08-29_00036_.png',
}

NAME_MAP = {
    '미야자와리나': '미야자와_리나',
    '타치바나미사키': '타치바나_미사키',
    '아키야마미호': '아키야마_미호',
    '센노리나': '센노_리나',
    '사쿠라기마이': '사쿠라기_마이',
    '루이자': '루이자',
    '리메이': '리메이',
    '시라카와아야': '시라카와_아야',
    '사토메구미': '사토_메구미',
}

OUT = r'C:/Users/shogu/Desktop/프로필_이미지'
os.makedirs(OUT, exist_ok=True)

count = 0
for j in jobs:
    char = j['char']
    typ = j['type']
    rp = j['resultPath']
    if char == '아키야마미호':
        rp = MIHO[typ]
    if not rp or not os.path.exists(rp):
        print(f'{char} {typ}: 파일 없음 {rp}')
        continue
    d = os.path.join(OUT, NAME_MAP[char])
    os.makedirs(d, exist_ok=True)
    suffix = '아이콘' if typ == 'icon' else '일러스트'
    dst = os.path.join(d, f'{suffix}.webp')
    img = Image.open(rp).convert('RGB')
    img.save(dst, 'WEBP', quality=92)
    count += 1
    print(f'{NAME_MAP[char]} {suffix}.webp')

print(f'완료: {count}장 → {OUT}')
