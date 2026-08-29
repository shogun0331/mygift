#!/usr/bin/env python3
"""
SimpliGen 자동 파이프라인 (미야자와/미사키 등 캐릭터 이벤트 이미지)
- dispatch : 이미지 생성 dispatch + jobId 기록
- watch    : 10초 폴링 → 완성 감지 → 텔레그램 전송 → 전체 완료 보고
- check    : 완료/미완료 점검
- inspect  : 특정 jobId 상세(캐릭터/씬/프롬프트) 전송

사용법:
  python simpligen_pipeline.py watch   <jobs.json>
  python simpligen_pipeline.py check   <jobs.json>
  python simpligen_pipeline.py inspect <jobs.json> <jobId앞8자리>
"""
import json, os, sys, time
import requests

SG_TOKEN = 'sg-agent-cefef668d12c54664e4479813a7e83de06081201'
SG_BASE = 'http://localhost:48199'
ENV_PATH = 'F:/Hermes/.env'
PROJECT = 'f41c5812-95c2-471d-9f2a-02895ba1c3ea'


def load_env():
    env = {}
    with open(ENV_PATH, encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                env[k.strip()] = v.strip()
    return env


def tg_send(env, method, data=None, files=None):
    """텔레그램 API 호출 (한국 ISP 차단 → fallback IP 자동 시도)"""
    token = env['TELEGRAM_BOT_TOKEN']
    fallback = [x.strip() for x in env.get('TELEGRAM_FALLBACK_IPS', '').split(',') if x.strip()]
    hosts = ['api.telegram.org'] + fallback
    for host in hosts:
        url = f'https://{host}/bot{token}/{method}'
        headers = {} if host == 'api.telegram.org' else {'Host': 'api.telegram.org'}
        try:
            r = requests.post(url, data=data, files=files, headers=headers, timeout=30, verify=(host == 'api.telegram.org'))
            return r.json()
        except Exception:
            continue
    return None


def tg_message(env, chat_id, text):
    return tg_send(env, 'sendMessage', data={'chat_id': chat_id, 'text': text})


def tg_photo(env, chat_id, path, caption):
    with open(path, 'rb') as f:
        return tg_send(env, 'sendPhoto', data={'chat_id': chat_id, 'caption': caption}, files={'photo': f})


def sg_job(jid):
    r = requests.get(f'{SG_BASE}/jobs/{jid}', headers={'Authorization': f'Bearer {SG_TOKEN}'}, timeout=15)
    return r.json().get('job', {})


def sg_generate(prompt, neg, seed=None):
    opts = {'aspectRatio': '16:9', 'steps': 40, 'cfg': 5, 'negativePrompt': neg}
    if seed is not None:
        opts['seed'] = seed
    payload = json.dumps({
        'presetId': 'community--anima-anime-pack:anima-base-v1',
        'mediaType': 'image',
        'prompt': prompt,
        'options': opts,
        'backend': 'local',
        'project': PROJECT
    }).encode()
    r = requests.post(f'{SG_BASE}/generate', data=payload,
                      headers={'Authorization': f'Bearer {SG_TOKEN}', 'Content-Type': 'application/json'}, timeout=30)
    return r.json().get('jobId')


def load_jobs(path):
    d = json.load(open(path, encoding='utf-8'))
    return d['jobs'] if isinstance(d, dict) and 'jobs' in d else d


def save_jobs(path, jobs):
    json.dump({'jobs': jobs}, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)


def watch(path):
    env = load_env()
    chat_id = env['TELEGRAM_ALLOWED_USERS'].split(',')[0].strip()
    jobs = load_jobs(path)
    pending = sum(1 for j in jobs if j.get('status') != 'completed')
    print(f'watch 시작: {len(jobs)}컷, 대기 {pending}')
    seen_ids = {j['jobId'] for j in jobs}
    while True:
        # 파일 재로드: 실행 중 중간에 추가된 job도 감시
        fresh = load_jobs(path)
        for j in fresh:
            if j['jobId'] not in seen_ids:
                jobs.append(j)
                seen_ids.add(j['jobId'])
                print(f"[추가감지] {j['char']} | {j['event']} | i={j['i']} {j['beat']}")
        all_done = True
        for j in jobs:
            if j.get('status') == 'completed':
                continue
            job = sg_job(j['jobId'])
            st = job.get('status')
            if st == 'completed':
                j['status'] = 'completed'
                j['resultPath'] = job.get('resultPath')
                cap = f"{j['char']} | {j['event']} | i={j['i']} {j['beat']}"
                tg_photo(env, chat_id, j['resultPath'], cap)
                print(f"[전송] {cap}")
            elif st == 'failed':
                j['status'] = 'failed'
                tg_message(env, chat_id, f"❌ 실패: {j['char']} {j['event']} i={j['i']} {j['beat']}")
            else:
                all_done = False
        save_jobs(path, jobs)
        if all_done:
            tg_message(env, chat_id, f'✅ 모든 그림 제작 완료 ({len(jobs)}컷)')
            print(f'✅ 모든 그림 제작 완료 ({len(jobs)}컷)')
            break
        time.sleep(10)


def check(path):
    """점검: 각 컷의 jobId + node ID + 이미지를 하나씩 텔레그램 전송"""
    env = load_env()
    chat_id = env['TELEGRAM_ALLOWED_USERS'].split(',')[0].strip()
    jobs = load_jobs(path)
    sent = 0
    for j in jobs:
        job = sg_job(j['jobId'])
        st = job.get('status')
        if st == 'completed':
            j['status'] = 'completed'
            j['resultPath'] = job.get('resultPath')
        node_id = j.get('node') or f"insert_after={j.get('insert_after')}"
        cap = f"jobId={j['jobId'][:8]} | {j['char']} {j['event']} i={j['i']} {j['beat']}\nnode={node_id}"
        rp = j.get('resultPath')
        if rp and os.path.isfile(rp):
            tg_photo(env, chat_id, rp, cap)
            sent += 1
            print(f"[전송] {cap}")
        else:
            tg_message(env, chat_id, f"{cap}\n(상태: {st})")
    save_jobs(path, jobs)
    tg_message(env, chat_id, f'점검 완료: {sent}/{len(jobs)}장 전송')
    print(f'점검 완료: {sent}/{len(jobs)}장')


def inspect(path, jid_prefix):
    env = load_env()
    chat_id = env['TELEGRAM_ALLOWED_USERS'].split(',')[0].strip()
    jobs = load_jobs(path)
    hit = [j for j in jobs if j['jobId'].startswith(jid_prefix)]
    if not hit:
        tg_message(env, chat_id, f'❌ jobId {jid_prefix} 없음')
        return
    for j in hit:
        msg = (
            f"jobId: {j['jobId']}\n"
            f"캐릭터: {j['char']}\n"
            f"씬: {j['event']} i={j['i']} ({j['beat']})\n"
            f"파일: {j.get('resultPath', '(미완료)')}\n"
            f"프롬프트:\n{j.get('prompt','')}\n"
            f"네거티브:\n{j.get('negative','')}"
        )
        tg_message(env, chat_id, msg)
        print(msg)


def dispatch(char_name, event_name, out_path):
    """이미지_마스터.json에서 프롬프트 읽어 dispatch + jobId 기록"""
    base = os.path.dirname(os.path.abspath(__file__))
    m = json.load(open(os.path.join(base, '이미지_마스터.json'), encoding='utf-8'))
    c = m['characters'][char_name]
    ev = c['events'][event_name]
    jobs = []
    for cut in ev['cuts']:
        jid = sg_generate(cut['prompt'], cut['negative'])
        jobs.append({
            'jobId': jid, 'char': char_name, 'event': event_name,
            'i': cut['i'], 'beat': cut['beat'], 'node': cut.get('node'),
            'insert_after': cut.get('insert_after'), 'prompt': cut['prompt'],
            'negative': cut['negative'], 'status': 'queued'
        })
        print(f"{event_name} i={cut['i']:2d} {cut['beat']} -> {jid[:8]}")
    save_jobs(out_path, jobs)
    print(f'dispatch 완료: {len(jobs)}컷 -> {out_path}')
    return jobs


UPSCALE_CID = '276168f6-4783-4a2e-bebb-2533efed3136'  # 업스케일용 더미 캐릭터


def sg_upload(path):
    import base64
    with open(path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode()
    payload = json.dumps({'filename': os.path.basename(path), 'dataBase64': b64}).encode()
    r = requests.post(f'{SG_BASE}/uploads', data=payload,
                      headers={'Authorization': f'Bearer {SG_TOKEN}', 'Content-Type': 'application/json'}, timeout=120)
    return r.json().get('handle')


def sg_enhance(handle):
    payload = json.dumps({'filePath': handle, 'scale': 2, 'presetId': 'upscale-pack:rtx-upscale-image', 'mediaType': 'image'}).encode()
    r = requests.post(f'{SG_BASE}/characters/{UPSCALE_CID}/enhance', data=payload,
                      headers={'Authorization': f'Bearer {SG_TOKEN}', 'Content-Type': 'application/json'}, timeout=60)
    return r.json().get('jobId')


def map_jobs(jobs_file, char_name, desk_name=None):
    """업스케일 → WebP 변환 → 이벤트 JSON 적용 → PNG 정리 → 바탕화면 복사 (전체 자동화)"""
    from PIL import Image
    base = os.path.dirname(os.path.abspath(__file__))
    m = json.load(open(os.path.join(base, '이미지_마스터.json'), encoding='utf-8'))
    c = m['characters'][char_name]
    event_file = {ev_name: ev['file'] for ev_name, ev in c['events'].items()}

    jobs = load_jobs(jobs_file)
    env = load_env()
    chat_id = env['TELEGRAM_ALLOWED_USERS'].split(',')[0].strip()

    # 1) 업스케일 dispatch
    print('업스케일 dispatch...')
    for j in jobs:
        if not j.get('resultPath'):
            print('  resultPath 없음:', j['event'], j['i'])
            continue
        try:
            handle = sg_upload(j['resultPath'])
            j['enhanceJobId'] = sg_enhance(handle)
        except Exception as ex:
            print('  업스케일 실패:', j['event'], j['i'], ex)
            j['fail'] = True

    # 2) 업스케일 폴링
    print('업스케일 폴링...')
    for _ in range(120):
        all_done = True
        for j in jobs:
            if j.get('upscaledPath') or j.get('fail'):
                continue
            job = sg_job(j.get('enhanceJobId'))
            if job.get('status') == 'completed':
                j['upscaledPath'] = job.get('resultPath')
            elif job.get('status') == 'failed':
                j['fail'] = True
            else:
                all_done = False
        if all_done:
            break
        time.sleep(8)
    n_up = sum(1 for j in jobs if j.get('upscaledPath'))
    print(f'업스케일 완료 {n_up}/{len(jobs)}')

    # 3) WebP 변환 + JSON 적용
    events_dir = os.path.join(base, 'public', 'chapter_assets', 'events')
    by_event = {}
    for j in jobs:
        if j.get('upscaledPath'):
            by_event.setdefault(j['event'], []).append(j)

    for event, cuts in by_event.items():
        file = event_file[event]
        json_path = os.path.join(events_dir, file)
        rel = file.replace('.json', '')
        img_dir = os.path.join(events_dir, rel, 'images')
        os.makedirs(img_dir, exist_ok=True)

        for e in cuts:
            src = e['upscaledPath']
            webp_name = os.path.splitext(os.path.basename(src))[0] + '.webp'
            dst = os.path.join(img_dir, webp_name)
            Image.open(src).convert('RGB').save(dst, 'WEBP', quality=82, method=6)
            e['webp'] = webp_name

        data = json.load(open(json_path, encoding='utf-8'))
        nodes = data['nodes']
        media = data.setdefault('media', [])
        for e in cuts:
            webp = e.get('webp')
            if not webp:
                continue
            if e.get('node'):
                for n in nodes:
                    if n.get('id') == e['node']:
                        n['image'] = webp
                        break
            elif e.get('insert_after'):
                idx = None
                for i, n in enumerate(nodes):
                    if n.get('id') == e['insert_after']:
                        idx = i
                        break
                if idx is None:
                    print(f"⚠️ insert_after 노드 없음: {event} i={e['i']} {e['insert_after']}")
                elif nodes[idx].get('type') == 'graphic':
                    print(f"⚠️ insert_after가 graphic 노드(잘못된 매핑): {event} i={e['i']} {e['insert_after']} → text 노드여야 함")
                else:
                    nodes.insert(idx + 1, {
                        'id': f"graphic_{rel[:8]}_{e['i']}", 'type': 'graphic',
                        'image': webp, 'delay': 2, 'blurRegions': [], 'blurDefault': 4
                    })
            if not any(mm.get('fileName') == webp for mm in media):
                media.append({
                    'fileName': webp, 'kind': 'image',
                    'sourcePath': f'chapter_assets/events/{rel}/images/{webp}',
                    'url': f'media://chapter_assets/events/{rel}/images/{webp}',
                    'size': os.path.getsize(os.path.join(img_dir, webp))
                })
        # 기존 PNG 정리
        for f in os.listdir(img_dir):
            if f.endswith('.png'):
                os.remove(os.path.join(img_dir, f))
        # media PNG 제거
        data['media'] = [mm for mm in data['media'] if not (mm.get('kind') == 'image' and mm.get('fileName', '').lower().endswith('.png'))]
        json.dump(data, open(json_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
        print(f'  {event}: {len(cuts)}컷 적용')

    save_jobs(jobs_file, jobs)

    # 4) 바탕화면 복사
    if desk_name:
        import shutil
        dest = os.path.join('C:/Users/shogu/Desktop', desk_name)
        os.makedirs(dest, exist_ok=True)
        for event, cuts in by_event.items():
            rel = event_file[event].replace('.json', '')
            img_dir = os.path.join(events_dir, rel, 'images')
            dst_dir = os.path.join(dest, event)
            os.makedirs(dst_dir, exist_ok=True)
            for f in os.listdir(img_dir):
                if f.endswith('.webp'):
                    shutil.copy2(os.path.join(img_dir, f), os.path.join(dst_dir, f))
        print(f'바탕화면 복사: {dest}')

    tg_message(env, chat_id, f'✅ {char_name} 매핑 완료 ({n_up}컷)')
    print('매핑 완료')


if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(__doc__)
        sys.exit(1)
    cmd, path = sys.argv[1], sys.argv[2]
    if cmd == 'watch':
        watch(path)
    elif cmd == 'check':
        check(path)
    elif cmd == 'inspect':
        inspect(path, sys.argv[3])
    elif cmd == 'dispatch':
        dispatch(sys.argv[3], sys.argv[4], path)
    elif cmd == 'map':
        map_jobs(path, sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else None)
    else:
        print(__doc__)
