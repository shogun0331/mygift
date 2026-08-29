import json, base64, urllib.request, time

TOKEN = 'sg-agent-cefef668d12c54664e4479813a7e83de06081201'
BASE = 'http://localhost:48199'
CID = '276168f6-4783-4a2e-bebb-2533efed3136'  # 업스케일용 더미 캐릭터

final = json.load(open(r'F:/Broadcast/broadcast-game/_misaki_final.json', encoding='utf-8'))

def upload(path):
    with open(path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    p = json.dumps({'filename': path.split('/')[-1], 'dataBase64': b64}).encode()
    r = urllib.request.Request(f'{BASE}/uploads', data=p, method='POST')
    r.add_header('Authorization', f'Bearer {TOKEN}')
    r.add_header('Content-Type', 'application/json')
    return json.loads(urllib.request.urlopen(r, timeout=120).read())['handle']

def enhance(handle):
    e = json.dumps({'filePath': handle, 'scale': 2, 'presetId': 'upscale-pack:rtx-upscale-image', 'mediaType': 'image'}).encode()
    r = urllib.request.Request(f'{BASE}/characters/{CID}/enhance', data=e, method='POST')
    r.add_header('Authorization', f'Bearer {TOKEN}')
    r.add_header('Content-Type', 'application/json')
    return json.loads(urllib.request.urlopen(r, timeout=60).read()).get('jobId')

out = []
for i, f in enumerate(final):
    try:
        h = upload(f['resultPath'])
        ejid = enhance(h)
        f['enhanceJobId'] = ejid
        out.append(f)
        print(f"{i+1}/49 {f['event']} i={f['i']} -> {ejid[:8]}")
    except Exception as ex:
        print(f"{i+1}/49 FAIL {f['event']} i={f['i']}: {ex}")
        f['enhanceJobId'] = None
        out.append(f)

json.dump(out, open(r'F:/Broadcast/broadcast-game/_enhance_jobs_misaki.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print(f'\n업스케일 dispatch 완료: {sum(1 for x in out if x.get("enhanceJobId"))}컷')
