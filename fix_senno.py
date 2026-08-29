import json

BASE = r'F:/Broadcast/broadcast-game'
m = json.load(open(BASE + '/이미지_마스터.json', encoding='utf-8'))
c = m['characters']['센노리나']

LIGHT = {
    '스카웃': ('outdoor stage, empty outdoor stage', 'outdoor stage, soft daylight, natural outdoor lighting, even lighting, empty outdoor stage'),
    '데이트1': ('fine dining restaurant, night', 'fine dining restaurant, night, dim warm restaurant lighting, warm indoor lighting, even lighting'),
    '데이트2': ('yacht deck', 'yacht deck, night city lights, soft ambient lighting, even lighting'),
    '섹스': ('doorway, home, plain home', 'doorway, home, bedroom, warm indoor lighting, warm color temperature, soft warm light'),
    '엔딩': ('bride dressing room', 'bride dressing room, warm indoor lighting, soft warm light, even lighting'),
    'VIP': ('luxury hotel room', 'luxury hotel room, warm indoor lighting, warm color temperature, soft warm light'),
}

BGPATCH = {
    '데이트1': ('fine dining restaurant, no furniture', 'fine dining restaurant, dining table, chair, candle, wine glass'),
    '섹스': ('bare wall, no furniture', 'bed, white bedsheet, pillow, plain wall'),
    '엔딩': ('mirror, plain wall, no furniture', 'mirror, vanity table, chair, plain wall'),
    'VIP': ('bed only, plain wall, no furniture', 'bed, white bedsheet, pillow, nightstand, table lamp, plain wall'),
}

NEG_SOLO = ('lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, disfigured, wrong anatomy, '
            'jpeg artifacts, watermark, text, signature, censored, mosaic, '
            'dark skin, tan skin, black hair, brown hair, long hair, closed eyes, hat, headwear, '
            'masculine, manly, male face, broad shoulders, square jaw, flat chest, large breasts, chubby, fat, messy hair, ponytail, '
            '1boy, male, boy, man, male body, second person, another person')
NEG_BOY = NEG_SOLO.replace(', 1boy, male, boy, man, male body, second person, another person', '') + ', male head, male upper body'

changed = 0
for ev_name, ev in c['events'].items():
    light_from, light_to = LIGHT.get(ev_name, (None, None))
    bg_from, bg_to = BGPATCH.get(ev_name, (None, None))
    for cut in ev['cuts']:
        p = cut['prompt']
        p = p.replace('small breasts, B cup, slender',
                      'small breasts, B cup, slender, feminine face, soft facial features, long eyelashes, full lips')
        p = p.replace('black lace lingerie, black bra, black panties', 'black bra, black panties')
        p = p.replace('black lace lingerie', 'black bra, black panties')
        if light_from and light_from in p and 'even lighting' not in p and 'ambient lighting' not in p:
            p = p.replace(light_from, light_to, 1)
        if bg_from and bg_from in p:
            p = p.replace(bg_from, bg_to, 1)
        cut['prompt'] = p
        is_boy = any(k in p for k in ('1boy', 'pov', 'fellatio', 'ejaculation', 'sex', 'penetration', 'oral'))
        cut['negative'] = NEG_BOY if is_boy else NEG_SOLO
        changed += 1

json.dump(m, open(BASE + '/이미지_마스터.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'센노리나 프롬프트 수정: {changed}컷')
cut = c['events']['스카웃']['cuts'][0]
print('[스카웃 i=1] P:', cut['prompt'][:240])
print('  N 요소:', len(cut['negative'].split(',')))
