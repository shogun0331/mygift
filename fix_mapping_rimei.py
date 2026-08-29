import json, os

BASE = r'F:/Broadcast/broadcast-game'

MAPPING = {
    '스카웃': {
        1: ('node', 'node_1787177188105_0_6t7o'),
        2: ('ins', 'node_1787177188105_2_ve11'),
        3: ('ins', 'node_1787177188105_3_mcm4'),
        4: ('ins', 'node_1787177188105_9_home'),
        5: ('ins', 'node_1787177188105_15_t8ir'),
        6: ('ins', 'node_1787177188105_18_6vvr'),
        7: ('ins', 'node_1787177188105_20_igfr'),
        8: ('ins', 'node_1787177188105_25_htog'),
        9: ('ins', 'node_1787177188105_27_5acg'),
        10: ('ins', 'node_1787177188105_32_s5c2'),
    },
    '데이트1': {
        1: ('node', 'node_1787177840810_0_6f5q'),
        2: ('ins', 'node_1787177840810_2_o4ir'),
        3: ('ins', 'node_1787177840810_26_65vz'),
        4: ('ins', 'node_1787177840810_30_fjg4'),
        5: ('node', 'node_1787177840810_35_8xh2'),
        6: ('ins', 'node_1787177840810_39_zjsl'),
        7: ('ins', 'node_1787177840810_46_solr'),
        8: ('ins', 'node_1787177840810_52_hgtf'),
    },
    '데이트2': {
        1: ('node', 'node_1787178069328_0_q6cj'),
        2: ('ins', 'node_1787178069328_15_2554'),
        3: ('ins', 'node_1787178069328_30_naii'),
        4: ('ins', 'node_1787178069328_35_2qlu'),
        5: ('node', 'node_1787178069328_41_pe53'),
        6: ('node', 'node_1787178069328_55_w6qe'),
        7: ('node', 'node_1787178069328_64_eeds'),
        8: ('ins', 'node_1787178069328_66_1zid'),
    },
    '섹스': {
        1: ('node', 'node_1787179147661_0_0a7s'),
        2: ('ins', 'node_1787179147661_4_oovd'),
        3: ('ins', 'node_1787179147661_22_2a46'),
        4: ('node', 'node_1787179147661_25_wrw7'),
        5: ('node', 'node_1787179147661_33_gn6m'),
        6: ('node', 'node_1787179147661_42_vlqd'),
        7: ('node', 'node_1787179147661_46_vsyi'),
        8: ('node', 'node_1787179147661_51_vnfi'),
        9: ('ins', 'node_1787179147661_56_r319'),
        10: ('node', 'node_1787179147661_64_0ywo'),
    },
    '엔딩': {
        1: ('node', 'node_1786852002871_0_zx46'),
        2: ('ins', 'node_1786852002871_3_ooqv'),
        3: ('node', 'node_1786852002871_18_x9mq'),
        4: ('node', 'node_1786852002871_34_8hs0'),
        5: ('ins', 'node_1786852002871_38_5upb'),
        6: ('node', 'node_1786852002871_51_yrqe'),
        7: ('node', 'node_1786852002871_61_qblw'),
    },
    'VIP': {
        1: ('node', 'node_1787179099672_0_4tk7'),
        2: ('node', 'node_1787179099672_13_37r8'),
        3: ('node', 'node_1787179099672_17_vli8'),
        4: ('node', 'node_1787179099672_26_77nb'),
    },
}

m = json.load(open(os.path.join(BASE, '이미지_마스터.json'), encoding='utf-8'))
c = m['characters']['리메이']
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

jobs = json.load(open(os.path.join(BASE, '_jobs_rimei.json'), encoding='utf-8'))['jobs']
for j in jobs:
    ev_name, i = j['event'], j['i']
    if ev_name in MAPPING and i in MAPPING[ev_name]:
        kind, val = MAPPING[ev_name][i]
        if kind == 'node':
            j['node'], j['insert_after'] = val, None
        else:
            j['node'], j['insert_after'] = None, val
json.dump({'jobs': jobs}, open(os.path.join(BASE, '_jobs_rimei.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('리메이 node/insert_after 재매핑 완료')
