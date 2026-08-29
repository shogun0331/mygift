import json

BASE = r'F:/Broadcast/broadcast-game'
m = json.load(open(BASE + '/이미지_마스터.json', encoding='utf-8'))
c = m['characters']['아키야마미호']

# 여성화 + 헤어 + 체형 태그
FEMINIZE = [
    ('black hair, short hair,', 'black hair, short hair, middle part, slicked hair, neat smooth hair,'),
    ('brown eyes, narrow eyes, monolid', 'brown eyes, narrow eyes, monolid, feminine face, soft facial features, long eyelashes, full lips'),
    ('C cup', 'medium breasts, C cup, feminine figure, narrow waist, wide hips'),
]
# 경찰복 치마형 (스카웃/VIP)
SKIRT = ('no name tag', 'no name tag, short skirt, miniskirt, bare legs')

# 네거티브 (공통 여성화)
NEG_COMMON = ('lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, disfigured, wrong anatomy, '
              'jpeg artifacts, watermark, text, signature, censored, mosaic, '
              'pale skin, fair skin, white skin, dark skin, black skin, '
              'blonde hair, brown hair, long hair, closed eyes, hat, headwear, name tag, '
              'hair bridge, hair streak, striped hair, headband, belly fat, belly rolls, stomach rolls, double chin, '
              'masculine, manly, male face, broad shoulders, square jaw, thick eyebrows, flat chest, small breasts, messy hair, ponytail')
# solo 컷: 남성 전체 배제
NEG_SOLO = NEG_COMMON + ', 1boy, male, boy, man, male body, second person, another person, multiple people'
# 섹스/오랄/삽입(1boy/pov) 컷: 남성 얼굴·상체만 배제 (하체·자지 허용)
NEG_BOY = NEG_COMMON + ', male head, male upper body'

changed = 0
for ev_name, ev in c['events'].items():
    for cut in ev['cuts']:
        p = cut['prompt']
        for a, b in FEMINIZE:
            if a in p:
                p = p.replace(a, b)
        # 경찰복 치마 (스카웃/VIP만 no name tag 보유)
        if SKIRT[0] in p and 'police' in p:
            p = p.replace(SKIRT[0], SKIRT[1], 1)
        cut['prompt'] = p
        # 네거티브 컷 유형별
        is_boy = any(k in p for k in ('1boy', 'pov', 'fellatio', 'ejaculation', 'sex', 'penetration', 'oral'))
        cut['negative'] = NEG_BOY if is_boy else NEG_SOLO
        changed += 1

json.dump(m, open(BASE + '/이미지_마스터.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'미호 여성화/헤어/치마 적용: {changed}컷')

# 검증
cut = c['events']['스카웃']['cuts'][0]
print('[스카웃 i=1] P:', cut['prompt'][:260])
print('  N 요소:', len(cut['negative'].split(',')))
cut2 = c['events']['섹스']['cuts'][4]  # 오랄
print('[섹스 i=5 오랄] N 마지막:', cut2['negative'][-80:])
