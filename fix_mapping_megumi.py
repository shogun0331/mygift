import json, os

BASE = r'F:/Broadcast/broadcast-game'

MAPPING = {
    '스카웃': {
        1: ('node', 'node_1787117538729_0_wtt0'),
        2: ('ins', 'node_1787117538729_2_qk07'),
        3: ('ins', 'node_1787117538729_4_o8j2'),
        4: ('ins', 'node_1787117538729_8_fqxd'),
        5: ('ins', 'node_1787117538729_14_yzhy'),
        6: ('ins', 'node_1787117538729_17_gija'),
        7: ('ins', 'node_1787117538729_19_xtub'),
        8: ('ins', 'node_1787117538729_24_8hz2'),
        9: ('ins', 'node_1787117538729_26_jzmu'),
        10: ('ins', 'node_1787117538729_31_j2dc'),
    },
    '데이트1': {
        1: ('node', 'node_1787118174859_0_fzuv'),
        2: ('ins', 'node_1787118174859_2_g3jj'),
        3: ('ins', 'node_1787118174859_18_1kzn'),
        4: ('ins', 'node_1787118174859_17_1jf2'),
        5: ('ins', 'node_1787118174859_25_4a6f'),
        6: ('ins', 'node_1787118174859_29_c4dd'),
        7: ('node', 'node_1787118174859_38_ctf2'),
        8: ('ins', 'node_1787118174859_42_0wgk'),
        9: ('node', 'node_1787118174859_49_gqsw'),
        10: ('ins', 'node_1787118174859_66_gb6d'),
    },
    '데이트2': {
        1: ('node', 'node_1787118693734_0_eikx'),
        2: ('ins', 'node_1787118693734_15_3zlv'),
        3: ('ins', 'node_1787118693734_23_ehsf'),
        4: ('ins', 'node_1787118693734_28_jsch'),
        5: ('node', 'node_1787118693734_34_0o7z'),
        6: ('ins', 'node_1787118693734_42_a3g6'),
        7: ('node', 'node_1787118693734_48_l39u'),
        8: ('node', 'node_1787118693734_57_oxu9'),
        9: ('ins', 'node_1787118693734_59_7ipb'),
    },
    '섹스': {
        1: ('node', 'node_1787120009569_0_6vel'),
        2: ('ins', 'node_1787120009569_4_8i59'),
        3: ('ins', 'node_1787120009569_22_lp5f'),
        4: ('node', 'node_1787120009569_25_r5aq'),
        5: ('node', 'node_1787120009569_33_m65a'),
        6: ('node', 'node_1787120009569_42_krz2'),
        7: ('node', 'node_1787120009569_46_r042'),
        8: ('node', 'node_1787120009569_51_w8jn'),
        9: ('ins', 'node_1787120009569_56_kqr8'),
        10: ('node', 'node_1787120009569_64_clbf'),
    },
    '엔딩': {
        1: ('node', 'node_1786850083422_0_okhq'),
        2: ('ins', 'node_1786850083422_3_hnz2'),
        3: ('node', 'node_1786850083422_18_a43a'),
        4: ('node', 'node_1786850083422_34_hth1'),
        5: ('ins', 'node_1786850083422_38_cpct'),
        6: ('node', 'node_1786850083422_51_tc48'),
        7: ('node', 'node_1786850083422_61_lmpq'),
    },
    'VIP': {
        1: ('node', 'node_1787121047083_0_sjaq'),
        2: ('node', 'node_1787121047083_13_5oro'),
        3: ('node', 'node_1787121047083_17_8q93'),
        4: ('node', 'node_1787121047083_26_3r3e'),
        5: ('ins', 'node_1787121047083_28_74l1'),
    },
}

m = json.load(open(os.path.join(BASE, '이미지_마스터.json'), encoding='utf-8'))
c = m['characters']['사토메구미']
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

jobs = json.load(open(os.path.join(BASE, '_jobs_megumi.json'), encoding='utf-8'))['jobs']
for j in jobs:
    ev_name, i = j['event'], j['i']
    if ev_name in MAPPING and i in MAPPING[ev_name]:
        kind, val = MAPPING[ev_name][i]
        if kind == 'node':
            j['node'], j['insert_after'] = val, None
        else:
            j['node'], j['insert_after'] = None, val
json.dump({'jobs': jobs}, open(os.path.join(BASE, '_jobs_megumi.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('사토메구미 node/insert_after 재매핑 완료')
