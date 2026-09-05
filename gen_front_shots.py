import json, urllib.request

TOKEN = 'sg-agent-cefef668d12c54664e4479813a7e83de06081201'
BASE = 'http://localhost:48199'
PROJECT = 'f41c5812-95c2-471d-9f2a-02895ba1c3ea'

m = json.load(open(r'F:/Broadcast/broadcast-game/이미지_마스터.json', encoding='utf-8'))

# 캐릭터명 -> (이미지_마스터 키, 시드, cut point)
CHARS = [
    ('아키야마미호', 1623929430, 'bare legs'),
    ('센노리나', 2839475610, 'sheer tutu'),
    ('사쿠라기마이', 3948577102, 'backless dress'),
    ('루이자', 5081727364, 'red fringe skirt'),
    ('리메이', 6192837465, 'short sleeves'),
    ('시라카와아야', 7304959622, 'knee-length skirt'),
    ('사토메구미', 8415069732, 'no cap'),
    ('타치바나미사키', 987654321, 'black tights, plain'),
]

FRONT = 'standing, full body, front view, looking at viewer, plain white background, simple background, empty hands'

def gen(prompt, neg, seed):
    payload = json.dumps({
        'presetId': 'community--anima-anime-pack:anima-base-v1',
        'mediaType': 'image',
        'prompt': prompt,
        'options': {'aspectRatio': '16:9', 'steps': 40, 'cfg': 5, 'negativePrompt': neg, 'seed': seed},
        'backend': 'local',
        'project': PROJECT,
    }).encode()
    r = urllib.request.Request(BASE + '/generate', data=payload, method='POST')
    r.add_header('Authorization', 'Bearer ' + TOKEN)
    r.add_header('Content-Type', 'application/json')
    return json.loads(urllib.request.urlopen(r, timeout=30).read()).get('jobId')

results = []
for key, seed, cutpoint in CHARS:
    c = m['characters'][key]
    cut = c['events']['스카웃']['cuts'][0]
    p = cut['prompt']
    neg = cut['negative']
    # cutpoint까지 자르고 정면샷 태그 붙이기
    idx = p.find(cutpoint)
    if idx > 0:
        p = p[:idx + len(cutpoint)]
    p = p.rstrip(', ') + ', ' + FRONT
    jid = gen(p, neg, seed)
    results.append({'char': key, 'seed': seed, 'jobId': jid})
    print(f'{key} (seed {seed}) -> {jid[:8]}')

json.dump(results, open(r'F:/Broadcast/broadcast-game/_front_shots.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'정면샷 dispatch 완료: {len(results)}명')
