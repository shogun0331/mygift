import json

BASE = r'F:/Broadcast/broadcast-game'
m = json.load(open(BASE + '/이미지_마스터.json', encoding='utf-8'))
c = m['characters']['사토메구미']

LIGHT = {
    '스카웃': ('cafe, daytime', 'cafe, daytime, warm indoor lighting, soft warm light, even lighting'),
    '데이트1': ('japanese tea house', 'japanese tea house, warm indoor lighting, soft warm light, even lighting'),
    '데이트2': ('onsen, night', 'onsen, night, warm ambient lighting, soft warm light, even lighting'),
    '섹스': ('doorway, home, plain bedroom', 'doorway, home, bedroom, warm indoor lighting, warm color temperature, soft warm light'),
    '엔딩': ('bride dressing room', 'bride dressing room, warm indoor lighting, soft warm light, even lighting'),
    'VIP': ('luxury hotel room', 'luxury hotel room, warm indoor lighting, warm color temperature, soft warm light'),
}

BGPATCH = {
    '스카웃': ('empty cafe, no furniture', 'cafe table, chair, coffee cup'),
    '데이트1': ('tatami, empty, no furniture', 'tatami, tea table, tea set'),
    '데이트2': ('water only, steam, empty, no furniture', 'rock, wooden bucket, stone lantern'),
    '섹스': ('bed only, bare wall, no furniture', 'bed, white bedsheet, pillow'),
    '엔딩': ('mirror, plain wall, no furniture', 'mirror, vanity table, chair, plain wall'),
    'VIP': ('bed only, plain wall, no furniture', 'bed, white bedsheet, pillow, nightstand, plain wall'),
}

NEG_SOLO = ('lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, disfigured, wrong anatomy, '
            'jpeg artifacts, watermark, text, signature, censored, mosaic, '
            'dark skin, tan skin, blonde hair, brown hair, long hair, closed eyes, hat, cap, headwear, long sleeves, pink, '
            'masculine, manly, male face, broad shoulders, square jaw, flat chest, small breasts, skinny, thin, messy hair, '
            '1boy, male, boy, man, second person, another person')
NEG_BOY = NEG_SOLO.replace(', 1boy, male, boy, man, second person, another person', '') + ', male head, male upper body'

changed = 0
for ev_name, ev in c['events'].items():
    light_from, light_to = LIGHT.get(ev_name, (None, None))
    bg_from, bg_to = BGPATCH.get(ev_name, (None, None))
    for cut in ev['cuts']:
        p = cut['prompt']
        p = p.replace('large breasts, D cup, slim, slender',
                      'large breasts, D cup, slightly plump, soft body, curvy, feminine face, soft facial features, long eyelashes, full lips')
        p = p.replace('white nurse uniform, bare head', 'white nurse uniform, short sleeves, bare head')
        p = p.replace('white nurse uniform', 'white nurse uniform, short sleeves')
        p = p.replace('pink bikini', 'white bikini')
        p = p.replace('white lace lingerie, white bra, white panties', 'white bra, white panties')
        p = p.replace('white lace lingerie', 'white bra, white panties')
        if light_from and light_from in p and 'even lighting' not in p and 'ambient lighting' not in p:
            p = p.replace(light_from, light_to, 1)
        if bg_from and bg_from in p:
            p = p.replace(bg_from, bg_to, 1)
        cut['prompt'] = p
        is_boy = any(k in p for k in ('1boy', 'pov', 'fellatio', 'ejaculation', 'sex', 'penetration', 'oral', 'blowjob'))
        cut['negative'] = NEG_BOY if is_boy else NEG_SOLO
        changed += 1

json.dump(m, open(BASE + '/이미지_마스터.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'사토메구미 프롬프트 수정: {changed}컷')
cut = c['events']['스카웃']['cuts'][0]
print('[스카웃 i=1] P:', cut['prompt'][:230])
