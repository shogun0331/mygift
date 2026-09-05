import json, urllib.request

TOKEN = 'sg-agent-cefef668d12c54664e4479813a7e83de06081201'
BASE = 'http://localhost:48199'
PROJECT = 'f41c5812-95c2-471d-9f2a-02895ba1c3ea'

# 캐릭터별 정보: base(머리~체형), outfit(직업복장), bottom(하의), bra, panties, bg색감, seed
CHARS = {
    '아키야마미호': {
        'seed': 1623929430,
        'base': 'japanese, asian, black hair, short bob cut, chin-length hair, middle part, slicked hair, neat smooth hair, brown eyes, narrow eyes, monolid, feminine face, soft facial features, long eyelashes, thin lips, tan skin, tanned skin, bikini tan lines, bra tan lines, panty tan lines, medium breasts, C cup, feminine figure, narrow waist, wide hips',
        'outfit': 'police uniform, dark navy police shirt, navy shirt, short sleeves, police badge, short skirt, miniskirt',
        'bottom': 'dark navy police short skirt, miniskirt',
        'bra': 'black lace bra',
        'panties': 'black lace panties',
        'bg': 'police station, jail cell, iron bars, holding cell background',
    },
    '미야자와리나': {
        'seed': 987654321,
        'base': 'black hair, long hair, straight hair, brown eyes, fair skin, large breasts, D cup, feminine face, soft facial features, long eyelashes, full lips',
        'outfit': 'flight attendant uniform, blue blazer, white blouse, red neck scarf, blue pencil skirt',
        'bottom': 'blue pencil skirt',
        'bra': 'black lace bra',
        'panties': 'black lace panties',
        'bg': 'airplane cabin, airplane interior, airplane seats, sky blue lighting',
    },
    '타치바나미사키': {
        'seed': 987654321,
        'base': 'black hair, short bob cut, chin-length bob, light brown highlights, brown eyes, tan skin, warm tan skin, large breasts, D cup, feminine face, soft facial features, long eyelashes, full lips',
        'outfit': 'white tank top, black tights',
        'bottom': 'black tights',
        'bra': 'red bra',
        'panties': 'red panties',
        'bg': 'yoga studio, soft green lighting',
    },
    '센노리나': {
        'seed': 2839475610,
        'base': 'blonde hair, hair bun, blue eyes, fair skin, small breasts, B cup, slender, feminine face, soft facial features, long eyelashes, full lips',
        'outfit': 'ballet dancer, white leotard, sheer tutu',
        'bottom': 'white leotard, sheer tutu',
        'bra': 'black bra',
        'panties': 'white panties',
        'bg': 'ballet studio, soft pink lighting',
    },
    '사쿠라기마이': {
        'seed': 3948577102,
        'base': 'blonde hair, long hair, wavy hair, fair skin, bright light skin, large breasts, D cup, mature female, feminine face, soft facial features, long eyelashes, full lips, red lips, lipstick',
        'outfit': 'burgundy velvet slip dress, backless dress',
        'bottom': 'burgundy velvet slip dress',
        'bra': 'white bra',
        'panties': 'white panties',
        'bg': 'jazz bar, nightclub stage, burgundy wine lighting',
    },
    '루이자': {
        'seed': 5081727364,
        'base': 'blonde hair, long hair, wavy hair, brown eyes, brown skin, light brown skin, warm brown skin, large breasts, D cup, curvy, thick thighs, feminine face, soft facial features, long eyelashes, full lips',
        'outfit': 'samba dancer, red sequin bra top, red fringe skirt',
        'bottom': 'red fringe skirt',
        'bra': 'red bra',
        'panties': 'red panties',
        'bg': 'carnival stage, samba stage, warm orange red lighting',
    },
    '리메이': {
        'seed': 6192837465,
        'base': 'black hair, short hair, high ponytail, black eyes, fair skin, large breasts, D cup, mature female, feminine face, soft facial features, long eyelashes, full lips',
        'outfit': 'dark navy cheongsam, high slit, short sleeves',
        'bottom': 'dark navy cheongsam',
        'bra': 'red bra',
        'panties': 'red panties',
        'bg': 'chinese restaurant, dark navy with red accent lighting',
    },
    '시라카와아야': {
        'seed': 7304959622,
        'base': 'black hair, low bun, glasses, brown eyes, fair skin, large breasts, D cup, mature female, feminine face, soft facial features, long eyelashes, full lips, eye wrinkles, crows feet',
        'outfit': 'white dress shirt, button-up shirt, long sleeves, navy pencil skirt, knee-length skirt',
        'bottom': 'navy pencil skirt, knee-length skirt',
        'bra': 'black bra',
        'panties': 'black panties',
        'bg': 'university classroom, office, deep indigo lighting',
    },
    '사토메구미': {
        'seed': 8415069732,
        'base': 'black hair, short hair, wavy hair, brown eyes, fair skin, D cup, soft body, curvy, feminine face, soft facial features, long eyelashes, full lips',
        'outfit': 'white nurse uniform, short sleeves, bare head, no hat, no cap',
        'bottom': 'white nurse uniform skirt',
        'bra': 'white bra',
        'panties': 'white panties',
        'bg': 'hospital ward, nurse station, soft white pink lighting',
    },
}

NEG = 'lowres, bad anatomy, bad hands, extra fingers, extra limbs, deformed, disfigured, wrong anatomy, jpeg artifacts, watermark, text, signature, censored, mosaic, pixelated, censor bar, 1boy, male, boy, man, male body, male face, second person, another person, multiple people, crowd, masculine, manly, broad shoulders, futa, futanari, face, head, eyes'

BG = 'broadcast studio, dark tiled wall background, minimal studio props, no text, no signage, no people'


def make_prompts(c):
    base = c['base']
    outfit = c['outfit']
    bottom = c['bottom']
    bra = c['bra']
    panties = c['panties']
    bg = c['bg']
    head = f'masterpiece, best quality, highres, 1girl, solo, {base}, seductive expression, half-lidded eyes, blushing'
    bgfull = f'{BG}, {bg}'

    cuts = []
    # 서있는 자세 (정면 상체)
    cuts.append(f'{head}, {outfit}, standing, looking at viewer, upper body, neutral pose, hands at sides, {bgfull}')
    cuts.append(f'{head}, {outfit}, standing, looking at viewer, close-up, face and chest focus, partially unbuttoned shirt, top buttons undone, breasts exposed, touching own nipple with one hand, playing with own nipple, drooling, saliva from mouth, cleavage, {bgfull}')
    cuts.append(f'{head}, topless, bare breasts, nipples, cupping own breasts with both hands, groping own breasts, standing, looking at viewer, upper body, wearing {bottom}, {bgfull}')
    cuts.append(f'{head}, standing, looking at viewer, upper body, wearing {bra}, bra pulled down on one side, one breast exposed, one nipple visible, wearing {bottom}, {bgfull}')
    # 후배위 (엉덩이 포커스)
    cuts.append(f'{head}, {outfit}, rear view, from behind, ass focus, doggystyle position, on all fours, {bgfull}')
    cuts.append(f'{head}, rear view, from behind, ass focus, doggystyle position, on all fours, looking back, {outfit} hiked up, revealing {panties}, {bgfull}')
    cuts.append(f'{head}, rear view, from behind, ass focus, topless, wearing {panties} only, touching own buttocks with both hands, {bgfull}')
    cuts.append(f'{head}, rear view, from behind, ass focus, wearing {panties} only, touching own crotch over panties, wet panties, {bgfull}')
    # V자 다리 (보지 포커스)
    cuts.append(f'{head}, {outfit}, sitting on floor, legs spread in V shape, front view, {bgfull}')
    cuts.append(f'{head}, sitting on floor, legs spread in V shape, front view, crotch focus, {outfit} hiked up, revealing {panties}, wet panties, {bgfull}')
    cuts.append(f'{head}, sitting on floor, legs spread in V shape, front view, crotch focus, topless, revealing {panties}, wet panties, {bgfull}')
    cuts.append(f'{head}, sitting on floor, legs spread in V shape, front view, crotch focus, wearing {panties} only, touching own crotch over panties, wet panties, {bgfull}')
    # 바닥 누워 (위에서 아래 풀포커스)
    cuts.append(f'{head}, {outfit}, lying on back on floor, full body, from above, top-down view, {bgfull}')
    cuts.append(f'{head}, lying on back on floor, full body, from above, top-down view, {outfit}, top pulled down to expose nipples, nipples visible, {bgfull}')
    cuts.append(f'{head}, lying on back on floor, full body, from above, top-down view, topless, revealing {panties}, touching own nipples with both hands, {bgfull}')
    cuts.append(f'{head}, lying on back on floor, full body, from above, top-down view, wearing {panties} only, touching own crotch over panties, wet panties, {bgfull}')
    return cuts


def gen(prompt, seed, ratio='16:9'):
    payload = json.dumps({
        'presetId': 'community--anima-anime-pack:anima-base-v1',
        'mediaType': 'image', 'prompt': prompt,
        'options': {'aspectRatio': ratio, 'steps': 40, 'cfg': 5, 'negativePrompt': NEG, 'seed': seed},
        'backend': 'local', 'project': PROJECT,
    }).encode()
    r = urllib.request.Request(BASE + '/generate', data=payload, method='POST')
    r.add_header('Authorization', 'Bearer ' + TOKEN)
    r.add_header('Content-Type', 'application/json')
    return json.loads(urllib.request.urlopen(r, timeout=30).read()).get('jobId')


if __name__ == '__main__':
    import sys
    name = sys.argv[1] if len(sys.argv) > 1 else '아키야마미호'
    c = CHARS[name]
    cuts = make_prompts(c)
    jobs = []
    for i, p in enumerate(cuts, 1):
        jid = gen(p, c['seed'])
        jobs.append({'char': name, 'cut': i, 'jobId': jid})
        print(f'{name} 컷{i}: {jid[:8]}')
    json.dump(jobs, open(f'F:/Broadcast/broadcast-game/_lewd_{name}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'{name} 12컷 dispatch 완료')
