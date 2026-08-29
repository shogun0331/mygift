import json, urllib.request

TOKEN = 'sg-agent-cefef668d12c54664e4479813a7e83de06081201'
BASE = 'http://localhost:48199'
PROJECT = 'f41c5812-95c2-471d-9f2a-02895ba1c3ea'

m = json.load(open(r'F:/Broadcast/broadcast-game/이미지_마스터.json', encoding='utf-8'))
c = m['characters']['타치바나미사키']

def gen(prompt, neg):
    payload = json.dumps({
        'presetId': 'community--anima-anime-pack:anima-base-v1',
        'mediaType': 'image',
        'prompt': prompt,
        'options': {'aspectRatio': '16:9', 'steps': 40, 'cfg': 5, 'negativePrompt': neg},
        'backend': 'local',
        'project': PROJECT
    }).encode()
    req = urllib.request.Request(f'{BASE}/generate', data=payload, method='POST')
    req.add_header('Authorization', f'Bearer {TOKEN}')
    req.add_header('Content-Type', 'application/json')
    return json.loads(urllib.request.urlopen(req, timeout=30).read()).get('jobId')

jobs = []
for ev_name, ev in c['events'].items():
    for cut in ev['cuts']:
        jid = gen(cut['prompt'], cut['negative'])
        jobs.append({
            'jobId': jid, 'char': '타치바나미사키', 'event': ev_name,
            'i': cut['i'], 'beat': cut['beat'], 'node': cut.get('node'),
            'insert_after': cut.get('insert_after'), 'seed': 987654321,
            'prompt': cut['prompt'], 'negative': cut['negative'], 'status': 'queued'
        })
        print(f"{ev_name} i={cut['i']:2d} {cut['beat']} -> {jid[:8]}")

json.dump({'jobs': jobs}, open(r'F:/Broadcast/broadcast-game/_jobs_misaki.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'\n총 {len(jobs)}컷 dispatch 완료')
