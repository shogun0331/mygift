import json, os

BASE = r'F:/Broadcast/broadcast-game'

MAPPING = {
    '스카웃': {
        1: ('node', 'node_1787180305450_0_1soq'),
        2: ('ins', 'node_1787180305450_2_h5z2'),
        3: ('ins', 'node_1787180305450_3_6t5e'),
        4: ('ins', 'node_1787180305450_9_3djv'),
        5: ('ins', 'node_1787180305450_15_jjsn'),
        6: ('ins', 'node_1787180305450_18_grgv'),
        7: ('ins', 'node_1787180305450_20_j82g'),
        8: ('ins', 'node_1787180305450_25_v0b6'),
        9: ('ins', 'node_1787180305450_27_1bgt'),
        10: ('ins', 'node_1787180305450_32_llnp'),
    },
    '데이트1': {
        1: ('node', 'node_1787180802637_0_xmil'),
        2: ('ins', 'node_1787180802637_2_besj'),
        3: ('ins', 'node_1787180802637_17_thaz'),
        4: ('node', 'node_1787180802637_20_2jy2'),
        5: ('ins', 'node_1787180802637_21_3a6h'),
        6: ('ins', 'node_1787180802637_27_qqzh'),
        7: ('node', 'node_1787180912695_4m9g'),
    },
    '데이트2': {
        1: ('node', 'node_1787181357089_0_hgg3'),
        2: ('ins', 'node_1787181357089_15_17lz'),
        3: ('ins', 'node_1787181357089_29_2cne'),
        4: ('ins', 'node_1787181357089_34_ugjg'),
        5: ('node', 'node_1787181357089_40_hezu'),
        6: ('node', 'node_1787181357089_54_y968'),
        7: ('node', 'node_1787181357089_63_qzgv'),
        8: ('ins', 'node_1787181357089_65_hsim'),
    },
    '섹스': {
        1: ('node', 'node_1787182155513_0_1lop'),
        2: ('ins', 'node_1787182155513_4_xiz7'),
        3: ('ins', 'node_1787182155513_22_w354'),
        4: ('node', 'node_1787182155513_25_d0ns'),
        5: ('node', 'node_1787182155513_33_si86'),
        6: ('node', 'node_1787182155513_42_4l56'),
        7: ('node', 'node_1787182155513_47_fcze'),
        8: ('node', 'node_1787182155513_51_rr9d'),
        9: ('node', 'node_1787182155513_61_h0u0'),
    },
    '엔딩': {
        1: ('node', 'node_1786859299295_0_3xg8'),
        2: ('ins', 'node_1786859299295_3_9w1n'),
        3: ('node', 'node_1786859299295_18_j8mj'),
        4: ('node', 'node_1786859299295_34_9ezf'),
        5: ('ins', 'node_1786859299295_38_1flz'),
        6: ('node', 'node_1786859299295_51_jm7n'),
        7: ('node', 'node_1786859299295_61_ifjs'),
    },
    'VIP': {
        1: ('node', 'node_1787185754205_0_y488'),
        2: ('node', 'node_1787185754205_13_dj28'),
        3: ('node', 'node_1787185754205_17_uyfa'),
        4: ('node', 'node_1787185754205_26_57qi'),
    },
}

m = json.load(open(os.path.join(BASE, '이미지_마스터.json'), encoding='utf-8'))
c = m['characters']['루이자']
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

jobs = json.load(open(os.path.join(BASE, '_jobs_luiza.json'), encoding='utf-8'))['jobs']
for j in jobs:
    ev_name, i = j['event'], j['i']
    if ev_name in MAPPING and i in MAPPING[ev_name]:
        kind, val = MAPPING[ev_name][i]
        if kind == 'node':
            j['node'], j['insert_after'] = val, None
        else:
            j['node'], j['insert_after'] = None, val
json.dump({'jobs': jobs}, open(os.path.join(BASE, '_jobs_luiza.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('루이자 node/insert_after 재매핑 완료')
