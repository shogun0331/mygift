import json

BASE = r'F:/Broadcast/broadcast-game'
m = json.load(open(BASE + '/이미지_마스터.json', encoding='utf-8'))
c = m['characters']['타치바나미사키']

# 이벤트별 조명 삽입 (배경 토큰 -> 배경 토큰 + 일관된 조명)
LIGHT = {
    '스카웃': ('park, daytime', 'park, daytime, soft daylight, natural outdoor lighting, even lighting'),
    '데이트1': ('outdoor cafe, daytime', 'outdoor cafe, daytime, soft daylight, natural outdoor lighting, even lighting'),
    '데이트2': ('pilates studio', 'pilates studio, warm indoor lighting, soft warm light, even lighting'),
    '엔딩': ('bride dressing room', 'bride dressing room, warm indoor lighting, soft warm light, even lighting'),
    'VIP': ('luxury hotel room', 'luxury hotel room, warm indoor lighting, warm color temperature, soft warm light'),
}

# 네거티브 공통 추가 (헤어 브릿지 + 뱃살)
NEG_ADD = 'hair bridge, hair streak, horizontal hair highlight, striped hair, headband, hair accessory, hair band, belly fat, belly rolls, stomach rolls, double chin'

changed = 0
for ev_name, ev in c['events'].items():
    light_from, light_to = LIGHT.get(ev_name, (None, None))
    for cut in ev['cuts']:
        p = cut.get('prompt', '')
        # 1) 머리 길이 명확화
        if 'short bob cut' in p and 'chin-length' not in p:
            p = p.replace('short bob cut', 'short bob cut, chin-length bob')
        # 2) 조명 일관화
        if light_from and light_from in p and 'even lighting' not in p:
            p = p.replace(light_from, light_to, 1)
        cut['prompt'] = p
        # 3) 네거티브 추가
        n = cut.get('negative', '')
        if 'hair bridge' not in n:
            n = n.rstrip(',') + ', ' + NEG_ADD
        cut['negative'] = n
        changed += 1

json.dump(m, open(BASE + '/이미지_마스터.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'수정 완료: {changed}컷')

# 검증 출력
for ev_name, ev in c['events'].items():
    cut = ev['cuts'][0]
    print(f"\n[{ev_name}] 머리/조명 확인:")
    print('  P:', cut['prompt'][:260])
    print('  N(끝):', cut['negative'][-160:])
