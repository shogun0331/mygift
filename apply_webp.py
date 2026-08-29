import json, os, shutil, time
from PIL import Image
from collections import defaultdict

BASE = r'F:/Broadcast/broadcast-game'
EVENTS_DIR = os.path.join(BASE, 'public', 'chapter_assets', 'events')
UPSCALE_DIR = r'F:/Ai/Simpligen/output/df/upscale-packrtx-upscale-image'

EVENT_FILE = {
    '스카웃': 'scout_a.json',
    '데이트1': 'a.json',
    '데이트2': 'a1.json',
    '섹스': 'a3.json',
    '엔딩': 'a5.json',
    'VIP': 'a6.json',
}

ts = time.strftime('%Y%m%d_%H%M%S')
backup_dir = os.path.join(BASE, f'_backup_events_{ts}')
os.makedirs(backup_dir, exist_ok=True)

enh_path = os.path.join(BASE, '_enhance_jobs.json')
enh = json.load(open(enh_path, encoding='utf-8'))
shutil.copy2(enh_path, backup_dir)

# VIP i=3 재생성 반영 (새 업스케일 00058)
for e in enh:
    if e['event'] == 'VIP' and e['i'] == 3:
        e['upscaledPath'] = os.path.join(UPSCALE_DIR, '2026-08-28_00058_.png')
        print('VIP i=3 ->', e['upscaledPath'])

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

    # WebP 변환 + 복사
    for e in cuts:
        src = e['upscaledPath']
        if not os.path.isfile(src):
            report.append(f'MISSING {event} i={e["i"]}: {src}')
            e['webp'] = None
            continue
        webp_name = os.path.splitext(os.path.basename(src))[0] + '.webp'
        dst = os.path.join(img_dir, webp_name)
        Image.open(src).convert('RGB').save(dst, 'WEBP', quality=82, method=6)
        e['webp'] = webp_name
        e['dst_path'] = dst

    # JSON 적용
    data = json.load(open(json_path, encoding='utf-8'))
    nodes = data['nodes']
    media = data.setdefault('media', [])

    for e in cuts:
        webp = e['webp']
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
            new_id = f"graphic_{rel}_{e['i']}"
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
    report.append(f'{event} ({file}): {len(cuts)} cuts 적용')

json.dump(enh, open(enh_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

print('BACKUP:', backup_dir)
print('\n'.join(report))
