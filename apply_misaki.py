import json, os, shutil, time
from PIL import Image
from collections import defaultdict

BASE = r'F:/Broadcast/broadcast-game'
EVENTS_DIR = os.path.join(BASE, 'public', 'chapter_assets', 'events')

# 미사키 이벤트 -> UUID 파일명
EVENT_FILE = {
    '스카웃': '08e8e28c-c1bd-4b14-a8d8-797afa97288f.json',
    '데이트1': '527c3f8b-f496-4c25-9fd1-91096ec45330.json',
    '데이트2': 'a234616f-b272-4c51-94ae-ff079b5e37c7.json',
    '섹스': '56bf3ee3-f51b-4dc7-9dde-6c4ee5f76601.json',
    '엔딩': '44e62688-09fb-4531-a655-b02c24fbc880.json',
    'VIP': '9c23fc50-241f-457c-b53d-4c8eea480462.json',
}

ts = time.strftime('%Y%m%d_%H%M%S')
backup_dir = os.path.join(BASE, f'_backup_misaki_{ts}')
os.makedirs(backup_dir, exist_ok=True)

enh = json.load(open(os.path.join(BASE, '_enhance_jobs_misaki.json'), encoding='utf-8'))
by_event = defaultdict(list)
for e in enh:
    by_event[e['event']].append(e)

report = []
for event, file in EVENT_FILE.items():
    cuts = by_event.get(event, [])
    if not cuts:
        continue
    json_path = os.path.join(EVENTS_DIR, file)
    shutil.copy2(json_path, backup_dir)
    rel = file.replace('.json', '')
    img_dir = os.path.join(EVENTS_DIR, rel, 'images')
    os.makedirs(img_dir, exist_ok=True)

    for e in cuts:
        src = e.get('upscaledPath')
        if not src or not os.path.isfile(src):
            report.append(f'MISSING {event} i={e["i"]}: {src}')
            e['webp'] = None
            continue
        webp_name = os.path.splitext(os.path.basename(src))[0] + '.webp'
        dst = os.path.join(img_dir, webp_name)
        Image.open(src).convert('RGB').save(dst, 'WEBP', quality=82, method=6)
        e['webp'] = webp_name
        e['dst_path'] = dst

    data = json.load(open(json_path, encoding='utf-8'))
    nodes = data['nodes']
    media = data.setdefault('media', [])

    for e in cuts:
        webp = e.get('webp')
        if not webp:
            continue
        if e.get('node'):
            hit = False
            for n in nodes:
                if n.get('id') == e['node']:
                    n['image'] = webp
                    hit = True
                    break
            if not hit:
                report.append(f'NODE NOT FOUND {event} i={e["i"]} node={e["node"]}')
        elif e.get('insert_after'):
            idx = None
            for i, n in enumerate(nodes):
                if n.get('id') == e['insert_after']:
                    idx = i
                    break
            if idx is None:
                report.append(f'INSERT_AFTER NOT FOUND {event} i={e["i"]} after={e["insert_after"]}')
                continue
            new_id = f"graphic_{rel[:8]}_{e['i']}"
            nodes.insert(idx + 1, {
                'id': new_id, 'type': 'graphic', 'image': webp,
                'delay': 2, 'blurRegions': [], 'blurDefault': 4
            })
        if not any(m.get('fileName') == webp for m in media):
            size = os.path.getsize(e['dst_path'])
            media.append({
                'fileName': webp, 'kind': 'image',
                'sourcePath': f'chapter_assets/events/{rel}/images/{webp}',
                'url': f'media://chapter_assets/events/{rel}/images/{webp}',
                'size': size
            })

    json.dump(data, open(json_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    report.append(f'{event}: {len(cuts)} cuts 적용')

json.dump(enh, open(os.path.join(BASE, '_enhance_jobs_misaki.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

print('BACKUP:', backup_dir)
print('\n'.join(report))
