import json, os

BASE = r'F:/Broadcast/broadcast-game'

MAPPING = {
    '스카웃': {
        1: ('node', 'node_1787030522142_0_6lo7'),
        2: ('ins', 'node_1787030522142_3_fx35'),
        3: ('ins', 'node_1787030522142_5_2eni'),
        4: ('ins', 'node_1787030522142_7_wmjs'),
        5: ('ins', 'node_1787030522142_9_fxhk'),
        6: ('ins', 'node_1787030522142_11_4888'),
        7: ('ins', 'node_1787030522142_13_0ibt'),
        8: ('ins', 'node_1787030522142_15_g3cf'),
        9: ('ins', 'node_1787030522142_20_38mo'),
    },
    '데이트1': {
        1: ('node', 'node_1787031770896_0_9ay6'),
        2: ('node', 'node_1787031814464_bk0j'),
        3: ('ins', 'node_1787031770896_20_r0rj'),
        4: ('node', 'node_1787031770896_21_6ye2'),
        5: ('ins', 'node_1787031770896_26_w5i1'),
        6: ('node', 'node_1787031862647_5d95'),
        7: ('node', 'node_1787031902567_63ta'),
        8: ('node', 'node_1787031943702_e2n2'),
        9: ('ins', 'node_1787031770896_56_7ddx'),
    },
    '데이트2': {
        1: ('node', 'node_1787032057334_0_460i'),
        2: ('node', 'node_1787032057334_11_kfcq'),
        3: ('node', 'node_1787032057334_16_va6z'),
        4: ('node', 'node_1787032140246_5km3'),
        5: ('node', 'node_1787032057334_21_kdnc'),
        6: ('node', 'node_1787032057334_27_e4mj'),
        7: ('node', 'node_1787032057334_32_nft1'),
        8: ('node', 'node_1787032223836_ajl2'),
    },
    '섹스': {
        1: ('node', 'node_1787093989219_0_vw0s'),
        2: ('ins', 'node_1787093989219_4_qv6e'),
        3: ('ins', 'node_1787093989219_7_x10n'),
        4: ('node', 'node_1787093989219_8_mukz'),
        5: ('node', 'node_1787093989219_10_m4jt'),
        6: ('node', 'node_1787093989219_14_gahr'),
        7: ('node', 'node_1787093989219_19_8s0h'),
        8: ('node', 'node_1787093989219_29_rxvm'),
        9: ('node', 'node_1787094173033_ipxd'),
        10: ('node', 'node_1787093989219_34_200q'),
        11: ('node', 'node_1787094227185_o64j'),
    },
    '엔딩': {
        1: ('node', 'node_1786859106976_0_niwn'),
        2: ('ins', 'node_1786859106976_3_htqo'),
        3: ('node', 'node_1786859106976_18_0q86'),
        4: ('node', 'node_1786859106976_34_ku1z'),
        5: ('ins', 'node_1786859106976_38_ubld'),
        6: ('node', 'node_1786859106976_51_ustr'),
        7: ('node', 'node_1786859106976_61_fgd4'),
    },
    'VIP': {
        1: ('node', 'node_1787012131245_0_ehw3'),
        2: ('node', 'node_1787013070968_4uxd'),
        3: ('node', 'node_1787013088815_zpd7'),
        4: ('node', 'node_1787012131245_18_kehw'),
        5: ('node', 'node_1787012131245_28_njii'),
        6: ('node', 'node_1787013120498_p9zl'),
        7: ('node', 'node_1787013136831_jzcg'),
    },
}

m = json.load(open(os.path.join(BASE, '이미지_마스터.json'), encoding='utf-8'))
c = m['characters']['시라카와아야']
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

jobs = json.load(open(os.path.join(BASE, '_jobs_aya.json'), encoding='utf-8'))['jobs']
for j in jobs:
    ev_name, i = j['event'], j['i']
    if ev_name in MAPPING and i in MAPPING[ev_name]:
        kind, val = MAPPING[ev_name][i]
        if kind == 'node':
            j['node'], j['insert_after'] = val, None
        else:
            j['node'], j['insert_after'] = None, val
json.dump({'jobs': jobs}, open(os.path.join(BASE, '_jobs_aya.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('시라카와아야 node/insert_after 재매핑 완료')
