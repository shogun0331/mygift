import json

BASE = r'F:/Broadcast/broadcast-game'
m = json.load(open(BASE + '/이미지_마스터.json', encoding='utf-8'))
c = m['characters']['루이자']

LIGHT = {
    '스카웃': ('carnival stage, daytime', 'carnival stage, daytime, soft daylight, natural outdoor lighting, even lighting'),
    '데이트1': ('park, daytime', 'park, daytime, soft daylight, natural outdoor lighting, even lighting'),
    '데이트2': ('onsen, night', 'onsen, night, warm ambient lighting, soft warm light, even lighting'),
    '섹스': ('luxury hotel room, night', 'luxury hotel room, night, warm indoor lighting, warm color temperature, soft warm light'),
    '엔딩': ('bride dressing room', 'bride dressing room, warm indoor lighting, soft warm light, even lighting'),
    'VIP': ('luxury hotel room', 'luxury hotel room, warm indoor lighting, warm color temperature, soft warm light'),
}

BGPATCH = {
    '데이트2': ('onsen, water only, steam, empty, no furniture', 'onsen, water, steam, wooden bucket, rock, stone lantern'),
    '섹스': ('simple hotel room, bed only, plain wall, no furniture', 'bed, white bedsheet, pillow, nightstand, table lamp, plain wall'),
    '엔딩': ('mirror, plain wall, no furniture', 'mirror, vanity table, chair, plain wall'),
    'VIP': ('simple hotel room, bed only, plain wall, no furniture', 'bed, white bedsheet, pillow, nightstand, table lamp, plain wall'),
}

NEG_SOLO = ('lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, disfigured, wrong anatomy, '
            'jpeg artifacts, watermark, text, signature, censored, mosaic, '
            'pale skin, fair skin, white skin, black skin, very dark skin, black hair, brown hair, short hair, closed eyes, hat, headwear, '
            'masculine, manly, male face, broad shoulders, square jaw, flat chest, small breasts, chubby, fat, messy hair, '
            '1boy, male, boy, man, second person, another person')
NEG_BOY = NEG_SOLO.replace(', 1boy, male, boy, man, second person, another person', '') + ', male head, male upper body'

changed = 0
for ev_name, ev in c['events'].items():
    light_from, light_to = LIGHT.get(ev_name, (None, None))
    bg_from, bg_to = BGPATCH.get(ev_name, (None, None))
    for cut in ev['cuts']:
        p = cut['prompt']
        p = p.replace('large breasts, D cup, curvy, thick thighs',
                      'large breasts, D cup, curvy, thick thighs, feminine face, soft facial features, long eyelashes, full lips')
        p = p.replace('red lace lingerie, red bra, red panties', 'red bra, red panties')
        p = p.replace('red lace lingerie', 'red bra, red panties')
        if light_from and light_from in p and 'even lighting' not in p and 'ambient lighting' not in p:
            p = p.replace(light_from, light_to, 1)
        if bg_from and bg_from in p:
            p = p.replace(bg_from, bg_to, 1)
        cut['prompt'] = p
        is_boy = any(k in p for k in ('1boy', 'pov', 'fellatio', 'ejaculation', 'sex', 'penetration', 'oral', 'blowjob'))
        cut['negative'] = NEG_BOY if is_boy else NEG_SOLO
        changed += 1

json.dump(m, open(BASE + '/이미지_마스터.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'루이자 프롬프트 수정: {changed}컷')
cut = c['events']['스카웃']['cuts'][0]
print('[스카웃 i=1] P:', cut['prompt'][:230])
