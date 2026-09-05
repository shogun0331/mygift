import json, base64, urllib.request

TOKEN = 'sg-agent-cefef668d12c54664e4479813a7e83de06081201'
BASE = 'http://localhost:48199'
PROJECT = 'f41c5812-95c2-471d-9f2a-02895ba1c3ea'

ref = 'F:/Ai/Simpligen/output/df/community--anima-anime-packanima-base-v1/2026-08-28_00153_.png'


def post(path, body):
    payload = json.dumps(body).encode()
    r = urllib.request.Request(BASE + path, data=payload, method='POST')
    r.add_header('Authorization', 'Bearer ' + TOKEN)
    r.add_header('Content-Type', 'application/json')
    return json.loads(urllib.request.urlopen(r, timeout=30).read().decode())


# 참조 이미지 업로드
raw = open(ref, 'rb').read()
b64 = base64.b64encode(raw).decode()
up = post('/uploads', {'filename': 'ref.png', 'dataBase64': b64})
handle = up['handle']
print('handle:', handle)

prompts = {
    '서기1': 'Show the person in Figure 1 standing upright, facing forward, upper body view, arms relaxed at her sides, wearing her navy police shirt with short sleeves, police badge, and short skirt. Keep her face, hair, and body exactly the same. The background is a broadcast studio with a dark tiled wall.',
    '서기2': 'Show the person in Figure 1 standing upright, facing forward, upper body view, with her navy police shirt pulled down to expose her bare breasts and nipples. Keep her face, hair, and body exactly the same. The background is a broadcast studio with a dark tiled wall.',
    '서기3': 'Show the person in Figure 1 standing upright, facing forward, upper body view, topless with bare breasts and nipples, touching her own nipples with both hands, still wearing her navy police short skirt. Keep her face, hair, and body exactly the same. The background is a broadcast studio with a dark tiled wall.',
}

jobs = {}
for label, p in prompts.items():
    body = {
        'presetId': 'firered-image-edit-pack:firered-image-edit-11',
        'mediaType': 'image',
        'prompt': p,
        'referenceImages': [handle],
        'selectedUserLoras': ['Qwen_Image_Edit_2511_All_included_with_extra_gay_v2.0'],
        'options': {'aspectRatio': '16:9', 'steps': 15, 'cfg': 1, 'seed': 1623929430},
        'backend': 'local',
        'project': PROJECT,
    }
    r = post('/generate', body)
    jid = r['jobId']
    jobs[label] = jid
    print(f'{label}: {jid[:8]}')

json.dump(jobs, open('F:/Broadcast/broadcast-game/_miho_firered.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
