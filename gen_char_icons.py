import json, urllib.request

TOKEN = 'sg-agent-cefef668d12c54664e4479813a7e83de06081201'
BASE = 'http://localhost:48199'
PROJECT = 'f41c5812-95c2-471d-9f2a-02895ba1c3ea'

m = json.load(open(r'F:/Broadcast/broadcast-game/이미지_마스터.json', encoding='utf-8'))

# (이미지_마스터키, 시드, cutpoint(복장 끝), 표정, 직업배경)
CHARS = [
    ('미야자와리나', 987654321, 'blue pencil skirt', 'gentle professional smile, warm friendly expression', 'airplane cabin, soft cabin lighting, airplane seat'),
    ('타치바나미사키', 987654321, 'black tights, plain', 'warm gentle smile, calm relaxed expression', 'yoga studio, wooden floor, yoga mat'),
    ('아키야마미호', 1623929430, 'bare legs', 'cold sharp expression, narrow eyes, no smile', 'police station, night street, patrol car'),
    ('센노리나', 2839475610, 'sheer tutu', 'elegant gentle smile, graceful expression', 'ballet studio, mirror, barre'),
    ('사쿠라기마이', 3948577102, 'backless dress', 'cynical smirk, playful expression', 'jazz club stage, microphone, warm stage light'),
    ('루이자', 5081727364, 'red fringe skirt', 'cheerful bright smile, open energetic expression', 'carnival stage, colorful lights, festive'),
    ('리메이', 6192837465, 'short sleeves', 'calm composed expression, no smile', 'chinese restaurant, red lantern, wooden table'),
    ('시라카와아야', 7304959622, 'knee-length skirt', 'cold sharp expression, no smile', 'university lecture hall, chalkboard, desk'),
    ('사토메구미', 8415069732, 'no cap', 'shy blushing smile, gentle timid expression', 'hospital room, white wall, medical equipment'),
]

def gen(prompt, neg, seed, ratio):
    payload = json.dumps({
        'presetId': 'community--anima-anime-pack:anima-base-v1',
        'mediaType': 'image',
        'prompt': prompt,
        'options': {'aspectRatio': ratio, 'steps': 40, 'cfg': 5, 'negativePrompt': neg, 'seed': seed},
        'backend': 'local',
        'project': PROJECT,
    }).encode()
    r = urllib.request.Request(BASE + '/generate', data=payload, method='POST')
    r.add_header('Authorization', 'Bearer ' + TOKEN)
    r.add_header('Content-Type', 'application/json')
    return json.loads(urllib.request.urlopen(r, timeout=30).read()).get('jobId')

results = []
for key, seed, cutpoint, expr, bg in CHARS:
    c = m['characters'][key]
    cut = c['events']['스카웃']['cuts'][0]
    p = cut['prompt']
    neg = cut['negative']
    idx = p.find(cutpoint)
    base = p[:idx + len(cutpoint)] if idx > 0 else p
    base = base.rstrip(', ')

    # 1) 1:1 아이콘 (증명사진 느낌)
    icon_p = base + f', {expr}, portrait, headshot, close-up, looking at viewer, plain background, simple background'
    # 2) 3:4 일러스트 (상체, 직업 배경)
    art_p = base + f', {expr}, upper body, looking at viewer, {bg}'

    icon_jid = gen(icon_p, neg, seed, '1:1')
    art_jid = gen(art_p, neg, seed, '3:4')

    results.append({'char': key, 'seed': seed, 'type': 'icon', 'jobId': icon_jid})
    results.append({'char': key, 'seed': seed, 'type': 'art', 'jobId': art_jid})
    print(f'{key} icon={icon_jid[:8]} art={art_jid[:8]}')

json.dump(results, open(r'F:/Broadcast/broadcast-game/_char_icons.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'dispatch 완료: {len(results)}장 (9명 x 2)')
