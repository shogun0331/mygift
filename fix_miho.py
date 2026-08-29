import json

BASE = r'F:/Broadcast/broadcast-game'
m = json.load(open(BASE + '/이미지_마스터.json', encoding='utf-8'))
c = m['characters']['아키야마미호']

# 이벤트별 조명 (피부색 일관성)
LIGHT = {
    '스카웃': ('street, daytime', 'street, daytime, soft daylight, natural outdoor lighting, even lighting'),
    '데이트1': ('pub, night', 'pub, night, dim warm bar lighting, warm indoor lighting, even lighting'),
    '데이트2': ('observation deck', 'observation deck, night city lights, soft ambient lighting, even lighting'),
    '섹스': ('home, plain home', 'home, bedroom, warm indoor lighting, warm color temperature, soft warm light'),
    '엔딩': ('bride dressing room', 'bride dressing room, warm indoor lighting, soft warm light, even lighting'),
    'VIP': ('luxury hotel room', 'luxury hotel room, warm indoor lighting, warm color temperature, soft warm light'),
}

# 빈 배경 → 사물 배치
BGPATCH = {
    '데이트1': ('table only, empty', 'bar counter, wooden table, chair, bar stools'),
    '섹스': ('bare wall, no furniture', 'bed, white bedsheet, pillow, plain wall'),
    '엔딩': ('mirror, plain wall, no furniture', 'mirror, vanity table, chair, plain wall'),
    'VIP': ('bed only, plain wall, no furniture', 'bed, white bedsheet, pillow, nightstand, table lamp, plain wall'),
}

# 미호용 네거티브 (간결 — 캐릭터별)
NEG_SOLO = 'lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, disfigured, wrong anatomy, jpeg artifacts, watermark, text, signature, censored, mosaic, pale skin, fair skin, white skin, dark skin, black skin, blonde hair, brown hair, long hair, closed eyes, hat, headwear, name tag, hair bridge, hair streak, striped hair, headband, belly fat, belly rolls, stomach rolls, double chin'
NEG_BOY = NEG_SOLO + ', male face, male head, male upper body, male torso, male chest, second person, fish mouth, duck lips, protruding lips, pursed lips, hollow cheeks'

changed = 0
for ev_name, ev in c['events'].items():
    light_from, light_to = LIGHT.get(ev_name, (None, None))
    bg_from, bg_to = BGPATCH.get(ev_name, (None, None))
    for cut in ev['cuts']:
        p = cut['prompt']
        # 1) 태닝라인 + 태닝색상(청동 유지)
        p = p.replace('tan skin, bronze skin',
                      'tan skin, bronze skin, tan lines, bikini tan lines, pale untanned skin under clothes')
        # 2) 복장: lingerie → bra/panties (잠옷 방지)
        p = p.replace('black lace lingerie, black bra, black panties', 'black bra, black panties')
        p = p.replace('black lace lingerie', 'black bra, black panties')
        # 3) 조명 일관
        if light_from and light_from in p and 'even lighting' not in p and 'ambient lighting' not in p:
            p = p.replace(light_from, light_to, 1)
        # 4) 빈 배경 사물
        if bg_from and bg_from in p:
            p = p.replace(bg_from, bg_to, 1)
        cut['prompt'] = p
        # 5) 네거티브 재정리 (1boy/pov 컷은 남성 배제 추가)
        is_boy = ('1boy' in p) or ('pov' in p) or ('fellatio' in p) or ('ejaculation' in p) or ('sex' in p) or ('penetration' in p)
        cut['negative'] = NEG_BOY if is_boy else NEG_SOLO
        changed += 1

json.dump(m, open(BASE + '/이미지_마스터.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'미호 프롬프트 수정 완료: {changed}컷')

# 검증
for ev_name in ['스카웃', '섹스']:
    cut = c['events'][ev_name]['cuts'][0]
    print(f'\n[{ev_name}] P:', cut['prompt'][:220])
    print(f'  N 요소수:', len(cut['negative'].split(',')))
