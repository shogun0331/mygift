import json, os

BASE = r'F:/Broadcast/broadcast-game'

MAPPING = {
    '스카웃': {
        1: ('node', 'node_1787135825636_0_7g15'),
        2: ('ins', 'node_1787135825636_2_99ia'),
        3: ('ins', 'node_1787135825636_4_kdf4'),
        4: ('ins', 'node_1787135825636_6_xzrn'),
        5: ('ins', 'node_1787135825636_12_38pu'),
        6: ('ins', 'node_1787135825636_15_venj'),
        7: ('ins', 'node_1787135825636_17_jsvp'),
        8: ('ins', 'node_1787135825636_22_jx5h'),
        9: ('ins', 'node_1787135825636_24_0ja4'),
        10: ('ins', 'node_1787135825636_29_sgr8'),
    },
    '데이트1': {
        1: ('node', 'node_1787136140417_0_tx6q'),
        2: ('ins', 'node_1787136140417_2_6f6y'),
        3: ('ins', 'node_1787136140417_26_ba3f'),
        4: ('ins', 'node_1787136140417_30_9c08'),
        5: ('ins', 'node_1787136140417_35_kinv'),
        6: ('node', 'node_1787136140417_38_bsyf'),
        7: ('ins', 'node_1787136140417_42_tup8'),
        8: ('ins', 'node_1787136140417_50_527m'),
        9: ('node', 'node_1787136140417_49_ddw5'),
    },
    '데이트2': {
        1: ('node', 'node_1787137107168_0_t4c7'),
        2: ('ins', 'node_1787137107168_2_0qc8'),
        3: ('ins', 'node_1787137107168_27_1xd0'),
        4: ('ins', 'node_1787137107168_32_xbvh'),
        5: ('node', 'node_1787137107168_52_2un4'),
        6: ('node', 'node_1787137107168_61_2ktn'),
    },
    '섹스': {
        1: ('node', 'node_1787137637171_lm94'),
        2: ('ins', 'node_1787137422986_3_cput'),
        3: ('ins', 'node_1787137422986_21_7l5f'),
        4: ('node', 'node_1787137422986_23_w12m'),
        5: ('node', 'node_1787137422986_31_skhq'),
        6: ('node', 'node_1787137422986_40_v3j9'),
        7: ('node', 'node_1787137422986_44_akxt'),
        8: ('node', 'node_1787137422986_49_o71f'),
        9: ('ins', 'node_1787137422986_54_9pww'),
        10: ('node', 'node_1787137422986_62_hn5s'),
    },
    '엔딩': {
        1: ('node', 'node_1786858470286_0_m5mj'),
        2: ('ins', 'node_1786858470286_3_g4p4'),
        3: ('node', 'node_1786858470286_18_wo7q'),
        4: ('node', 'node_1786858470286_34_b0wf'),
        5: ('ins', 'node_1786858470286_38_v5m7'),
        6: ('node', 'node_1786858470286_51_7r0d'),
        7: ('node', 'node_1786858470286_61_5sma'),
    },
    'VIP': {
        1: ('node', 'node_1787138628785_0_b5bb'),
        2: ('node', 'node_1787138628785_13_waje'),
        3: ('node', 'node_1787138628785_17_rqlm'),
        4: ('node', 'node_1787138628785_26_wrwu'),
        5: ('ins', 'node_1787138628785_28_s1pv'),
    },
}

# 이미지_마스터.json 수정
m = json.load(open(os.path.join(BASE, '이미지_마스터.json'), encoding='utf-8'))
c = m['characters']['아키야마미호']
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

# _jobs_miho.json 수정
jobs = json.load(open(os.path.join(BASE, '_jobs_miho.json'), encoding='utf-8'))['jobs']
for j in jobs:
    ev_name, i = j['event'], j['i']
    if ev_name in MAPPING and i in MAPPING[ev_name]:
        kind, val = MAPPING[ev_name][i]
        if kind == 'node':
            j['node'], j['insert_after'] = val, None
        else:
            j['node'], j['insert_after'] = None, val
json.dump({'jobs': jobs}, open(os.path.join(BASE, '_jobs_miho.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('미호 node/insert_after 재매핑 완료 (이미지_마스터 + _jobs)')
