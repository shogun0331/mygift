import json

BASE = r'F:/Broadcast/broadcast-game'
m = json.load(open(BASE + '/이미지_마스터.json', encoding='utf-8'))
c = m['characters']['사쿠라기마이']

# 센노 리나 엔딩 프롬프트를 사쿠라기 마이 버전으로 변환한 7컷 정의
# node/insert_after는 센노 리나 엔딩과 동일한 node ID 사용 (이벤트 JSON도 동일 node ID 재사용)
MAI_BASE = ('blonde hair, long hair, wavy hair, fair skin, bright light skin, '
            'large breasts, D cup, mature female, feminine face, soft facial features, long eyelashes, full lips, red lips, lipstick')

CUTS = [
    # i, beat, desc, kind(node/ins), node_id, 복장/자세/표정/배경 토큰
    (1, '거울', '신부대기실 거울 앞 웨딩드레스', 'node', 'node_1786860403048_0_m76k',
     'white wedding dress, off-shoulder, lace bodice, veil, standing in front of mirror, cynical smile'),
    (2, '대화', '예쁘네요에 시니컬·부끄러움', 'ins', 'node_1786860403048_3_vjhs',
     'white wedding dress, off-shoulder, lace bodice, veil, blushing, shy smile'),
    (3, '오랄', '웨딩드레스 입고 무릎 꿇고 오랄', 'node', 'node_1786860403048_18_h8an',
     'blowjob, fellatio, oral sex, penis in mouth, white wedding dress, veil, kneeling, on knees, looking up, male lower body only'),
    (4, '소파자세', '소파 손 짚고 치마 걷어올림', 'node', 'node_1786860403048_34_vizq',
     'white wedding dress, skirt lifted, veil, bending over, rear view, butt facing camera'),
    (5, '후배위삽입', '후배위 삽입', 'ins', 'node_1786860403048_38_hurs',
     'sex, doggystyle, from behind, rear view, vaginal, penetration, penis in pussy, white wedding dress, skirt lifted, veil, looking back at viewer'),
    (6, '버진로드', '버진로드', 'node', 'node_1786860403048_51_yjtd',
     'white wedding dress, veil, standing, elegant, happy smile, wedding aisle'),
    (7, '임산부', '임산부 일반복', 'node', 'node_1786860403048_61_0zwm',
     'casual clothes, pregnant, pregnant belly, gentle smile'),
]

ROOM = 'bride dressing room, warm indoor lighting, soft warm light, even lighting, mirror, vanity table, chair, plain wall'

NEG_SOLO = ('lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, disfigured, wrong anatomy, '
            'jpeg artifacts, watermark, text, signature, censored, mosaic, '
            'dark skin, tan skin, black hair, brown hair, short hair, closed eyes, hat, headwear, '
            'masculine, manly, male face, broad shoulders, square jaw, flat chest, small breasts, chubby, fat, messy hair, '
            '1boy, male, boy, man, second person, another person')
NEG_BOY = NEG_SOLO.replace(', 1boy, male, boy, man, second person, another person', '') + ', male head, male upper body, male underwear, boxers, briefs'

new_cuts = []
for i, beat, desc, kind, node_id, pose in CUTS:
    prompt = f'masterpiece, best quality, highres, 1girl, {MAI_BASE}, {pose}, {ROOM}'
    if beat in ('오랄',):
        prompt = prompt.replace('1girl,', '1girl, 1boy,')
    elif beat == '후배위삽입':
        prompt = prompt.replace('1girl,', '1girl, pov, first person,')
    is_boy = beat in ('오랄', '후배위삽입')
    cut = {
        'i': i, 'beat': beat, 'desc': desc,
        'prompt': prompt, 'negative': NEG_BOY if is_boy else NEG_SOLO,
    }
    if kind == 'node':
        cut['node'] = node_id
        cut['insert_after'] = None
    else:
        cut['node'] = None
        cut['insert_after'] = node_id
    new_cuts.append(cut)

# 사쿠라기 마이 엔딩 cuts 교체
ev = c['events']['엔딩']
# 기존 cuts의 i 매핑을 보존하되 7컷으로 재구성
ev['cuts'] = new_cuts

json.dump(m, open(BASE + '/이미지_마스터.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('사쿠라기 마이 엔딩 cuts 7컷 재작성 완료')
for cut in new_cuts:
    print(f"  i={cut['i']} {cut['beat']}: {cut['node'] or cut['insert_after']}")
