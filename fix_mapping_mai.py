import json, os

BASE = r'F:/Broadcast/broadcast-game'

MAPPING = {
    '스카웃': {
        1: ('node', 'node_1787138881950_0_jvzs'),
        2: ('ins', 'node_1787138881950_2_5jv0'),
        3: ('ins', 'node_1787138881950_3_hbj8'),
        4: ('ins', 'node_1787138881950_9_8tfh'),
        5: ('ins', 'node_1787138881950_15_18vt'),
        6: ('ins', 'node_1787138881950_16_mrzs'),
        7: ('ins', 'node_1787138881950_18_7w4n'),
        8: ('ins', 'node_1787138881950_20_3nl7'),
        9: ('ins', 'node_1787138881950_25_sq7v'),
        10: ('ins', 'node_1787138881950_27_m7e8'),
        11: ('ins', 'node_1787138881950_32_qr56'),
    },
    '데이트1': {
        1: ('node', 'node_1787139086931_0_a6xm'),
        2: ('ins', 'node_1787139086931_2_1k44'),
        3: ('ins', 'node_1787139086931_26_rbsr'),
        4: ('ins', 'node_1787139086931_35_58sy'),
        5: ('node', 'node_1787139501521_xeck'),
        6: ('ins', 'node_1787139086931_42_1wq5'),
        7: ('ins', 'node_1787139086931_49_t5m6'),
        8: ('node', 'node_1787139360810_44ko'),
    },
    '데이트2': {
        1: ('node', 'node_1787139684807_0_nmhs'),
        2: ('ins', 'node_1787139684807_2_gyfh'),
        3: ('ins', 'node_1787139684807_27_scry'),
        4: ('node', 'node_1787139684807_33_6lmb'),
        5: ('ins', 'node_1787139684807_40_02ga'),
        6: ('node', 'node_1787139684807_46_uoja'),
        7: ('node', 'node_1787139684807_55_0z04'),
        8: ('ins', 'node_1787139684807_57_7zbk'),
    },
    '섹스': {
        1: ('node', 'node_1787140334560_0_kygr'),
        2: ('ins', 'node_1787140334560_4_05zx'),
        3: ('ins', 'node_1787140334560_22_o1pn'),
        4: ('node', 'node_1787140334560_25_38f9'),
        5: ('node', 'node_1787140334560_33_0714'),
        6: ('node', 'node_1787140334560_42_f4gs'),
        7: ('node', 'node_1787140334560_46_ykah'),
        8: ('node', 'node_1787140334560_50_mqow'),
        9: ('node', 'node_1787140334560_60_1cyz'),
    },
    'VIP': {
        1: ('node', 'node_1787264690002_0_s5az'),
        2: ('ins', 'node_1787264690002_12_rico'),
        3: ('node', 'node_1787264690002_26_4hmz'),
    },
}

m = json.load(open(os.path.join(BASE, '이미지_마스터.json'), encoding='utf-8'))
c = m['characters']['사쿠라기마이']
for ev_name, ev in c['events'].items():
    if ev_name not in MAPPING:
        continue
    for cut in ev['cuts']:
        i = cut['i']
        if i in MAPPING[ev_name]:
            kind, val = MAPPING[ev_name][i]
            if kind == 'node':
                cut['node'], cut['insert_after'] = val, None
            else:
                cut['node'], cut['insert_after'] = None, val
json.dump(m, open(os.path.join(BASE, '이미지_마스터.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

jobs = json.load(open(os.path.join(BASE, '_jobs_mai.json'), encoding='utf-8'))['jobs']
for j in jobs:
    ev_name, i = j['event'], j['i']
    if ev_name in MAPPING and i in MAPPING[ev_name]:
        kind, val = MAPPING[ev_name][i]
        if kind == 'node':
            j['node'], j['insert_after'] = val, None
        else:
            j['node'], j['insert_after'] = None, val
json.dump({'jobs': jobs}, open(os.path.join(BASE, '_jobs_mai.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('사쿠라기마이 node/insert_after 재매핑 완료')
