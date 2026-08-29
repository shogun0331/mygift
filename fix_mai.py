import json

BASE = r'F:/Broadcast/broadcast-game'
m = json.load(open(BASE + '/이미지_마스터.json', encoding='utf-8'))
c = m['characters']['사쿠라기마이']

LIGHT = {
    '스카웃': ('street stage, night', 'street stage, night, warm stage lighting, soft ambient lighting, even lighting'),
    '데이트1': ('jazz bar, night', 'jazz bar, night, dim warm bar lighting, warm indoor lighting, even lighting'),
    '데이트2': ('amusement park, daytime', 'amusement park, daytime, soft daylight, natural outdoor lighting, even lighting'),
    '섹스': ('doorway, home, plain home', 'doorway, home, bedroom, warm indoor lighting, warm color temperature, soft warm light'),
    '엔딩': ('luxury hotel room, simple hotel room', 'luxury hotel room, warm indoor lighting, warm color temperature, soft warm light'),
    'VIP': ('luxury hotel room, simple hotel room', 'luxury hotel room, warm indoor lighting, warm color temperature, soft warm light'),
}

BGPATCH = {
    '섹스': ('bare wall, no furniture', 'bed, white bedsheet, pillow, plain wall'),
    '엔딩': ('bed only, plain wall, no furniture', 'bed, white bedsheet, pillow, nightstand, table lamp, plain wall'),
    'VIP': ('bed only, plain wall, no furniture', 'bed, white bedsheet, pillow, nightstand, table lamp, plain wall'),
}

NEG_SOLO = ('lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, disfigured, wrong anatomy, '
            'jpeg artifacts, watermark, text, signature, censored, mosaic, '
            'dark skin, tan skin, black hair, brown hair, short hair, closed eyes, hat, headwear, '
            'masculine, manly, male face, broad shoulders, square jaw, flat chest, small breasts, chubby, fat, messy hair, '
            '1boy, male, boy, man, second person, another person')
NEG_BOY = NEG_SOLO.replace(', 1boy, male, boy, man, second person, another person', '') + ', male head, male upper body'

changed = 0
for ev_name, ev in c['events'].items():
    light_from, light_to = LIGHT.get(ev_name, (None, None))
    bg_from, bg_to = BGPATCH.get(ev_name, (None, None))
    for cut in ev['cuts']:
        p = cut['prompt']
        p = p.replace('large breasts, D cup, mature female',
                      'large breasts, D cup, mature female, feminine face, soft facial features, long eyelashes, full lips, red lips, lipstick')
        p = p.replace('white lace lingerie, white bra, white panties', 'white bra, white panties')
        p = p.replace('white lace lingerie', 'white bra, white panties')
        p = p.replace('pulling necktie', "pulling the man's necktie toward her")
        if light_from and light_from in p and 'even lighting' not in p and 'ambient lighting' not in p:
            p = p.replace(light_from, light_to, 1)
        if bg_from and bg_from in p:
            p = p.replace(bg_from, bg_to, 1)
        cut['prompt'] = p
        is_boy = any(k in p for k in ('1boy', 'pov', 'fellatio', 'ejaculation', 'sex', 'penetration', 'oral', 'blowjob'))
        cut['negative'] = NEG_BOY if is_boy else NEG_SOLO
        changed += 1

json.dump(m, open(BASE + '/이미지_마스터.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'사쿠라기마이 프롬프트 수정: {changed}컷')
cut = c['events']['스카웃']['cuts'][0]
print('[스카웃 i=1] P:', cut['prompt'][:230])
cut2 = [x for x in c['events']['섹스']['cuts'] if x['i'] == 3][0]
print('[섹스 i=3] 넥타이:', cut2['prompt'][cut2['prompt'].find('white'):][:120])
