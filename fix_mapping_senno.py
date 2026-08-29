import json, os

BASE = r'F:/Broadcast/broadcast-game'

MAPPING = {
    '스카웃': {
        1: ('node', 'node_1787131735813_0_t6vr'),
        2: ('ins', 'node_1787131735813_2_5toe'),
        3: ('ins', 'node_1787131735813_3_1vvg'),
        4: ('ins', 'node_1787131735813_9_o5s3'),
        5: ('ins', 'node_1787131735813_15_czio'),
        6: ('ins', 'node_1787131735813_18_nznr'),
        7: ('ins', 'node_1787131735813_20_uzj8'),
        8: ('ins', 'node_1787131735813_25_hyub'),
        9: ('ins', 'node_1787131735813_27_y9mg'),
        10: ('ins', 'node_1787131735813_32_p1e8'),
    },
    '데이트1': {
        1: ('node', 'node_1787131986609_0_9z25'),
        2: ('ins', 'node_1787131986609_2_8y8w'),
        3: ('ins', 'node_1787131986609_26_5y66'),
        4: ('ins', 'node_1787131986609_35_f0nb'),
        5: ('node', 'node_1787131986609_38_dkx6'),
        6: ('ins', 'node_1787131986609_42_caee'),
        7: ('ins', 'node_1787131986609_50_hjhe'),
        8: ('node', 'node_1787131986609_49_ex62'),
    },
    '데이트2': {
        1: ('node', 'node_1787132568339_0_ucnk'),
        2: ('ins', 'node_1787132568339_2_93hw'),
        3: ('ins', 'node_1787132568339_25_r6wt'),
        4: ('ins', 'node_1787132568339_30_nqk3'),
        5: ('node', 'node_1787132568339_36_d1w5'),
        6: ('node', 'node_1787132568339_50_tet1'),
        7: ('node', 'node_1787132568339_59_dx9b'),
        8: ('ins', 'node_1787132568339_61_2alr'),
    },
    '섹스': {
        1: ('node', 'node_1787133586562_0_xfc6'),
        2: ('ins', 'node_1787133586562_4_9xfz'),
        3: ('ins', 'node_1787133586562_22_gijl'),
        4: ('node', 'node_1787133586562_25_4774'),
        5: ('node', 'node_1787133586562_33_gi4s'),
        6: ('node', 'node_1787133586562_42_2xsi'),
        7: ('node', 'node_1787133586562_46_1fww'),
        8: ('node', 'node_1787133586562_50_ii30'),
        9: ('node', 'node_1787135064374_956j'),
    },
    '엔딩': {
        1: ('node', 'node_1786860403048_0_m76k'),
        2: ('ins', 'node_1786860403048_3_vjhs'),
        3: ('node', 'node_1786860403048_18_h8an'),
        4: ('node', 'node_1786860403048_34_vizq'),
        5: ('ins', 'node_1786860403048_38_hurs'),
        6: ('node', 'node_1786860403048_51_yjtd'),
        7: ('node', 'node_1786860403048_61_0zwm'),
    },
    'VIP': {
        1: ('node', 'node_1787135567398_0_pfjw'),
        2: ('node', 'node_1787135567398_13_wejd'),
        3: ('node', 'node_1787135567398_16_o5ub'),
        4: ('ins', 'node_1787135567398_19_z1eu'),
        5: ('node', 'node_1787135567398_30_0jyo'),
    },
}

m = json.load(open(os.path.join(BASE, '이미지_마스터.json'), encoding='utf-8'))
c = m['characters']['센노리나']
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

jobs = json.load(open(os.path.join(BASE, '_jobs_senno.json'), encoding='utf-8'))['jobs']
for j in jobs:
    ev_name, i = j['event'], j['i']
    if ev_name in MAPPING and i in MAPPING[ev_name]:
        kind, val = MAPPING[ev_name][i]
        if kind == 'node':
            j['node'], j['insert_after'] = val, None
        else:
            j['node'], j['insert_after'] = None, val
json.dump({'jobs': jobs}, open(os.path.join(BASE, '_jobs_senno.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('센노리나 node/insert_after 재매핑 완료')
