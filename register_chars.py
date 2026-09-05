import json, base64, urllib.request

TOKEN = 'sg-agent-cefef668d12c54664e4479813a7e83de06081201'
BASE = 'http://localhost:48199'

NAME_MAP = {
    '아키야마미호': '아키야마 미호',
    '센노리나': '센노 리나',
    '사쿠라기마이': '사쿠라기 마이',
    '루이자': '루이자',
    '리메이': '리메이',
    '시라카와아야': '시라카와 아야',
    '사토메구미': '사토 메구미',
    '타치바나미사키': '타치바나 미사키',
}

def post(path, body):
    payload = json.dumps(body).encode()
    r = urllib.request.Request(BASE + path, data=payload, method='POST')
    r.add_header('Authorization', 'Bearer ' + TOKEN)
    r.add_header('Content-Type', 'application/json')
    resp = urllib.request.urlopen(r, timeout=30).read().decode()
    return json.loads(resp)

jobs = json.load(open(r'F:/Broadcast/broadcast-game/_front_shots.json', encoding='utf-8'))

for j in jobs:
    key = j['char']
    rp = j['resultPath']
    name = NAME_MAP[key]
    # 1. 업로드 -> handle
    raw = open(rp, 'rb').read()
    b64 = base64.b64encode(raw).decode()
    fn = rp.split('/')[-1]
    up = post('/uploads', {'filename': fn, 'dataBase64': b64})
    handle = up.get('handle') or up.get('upload', {}).get('handle') if isinstance(up, dict) else None
    if not handle:
        print(f'{name}: 업로드 실패 {up}')
        continue
    # 2. 캐릭터 생성
    cc = post('/characters', {'name': name, 'gender': 'woman', 'mode': 'upload', 'baseHandle': handle})
    print(f'{name}: handle={handle[:12]}... -> {cc}')
