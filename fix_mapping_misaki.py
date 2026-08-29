import json, os

BASE = r'F:/Broadcast/broadcast-game'

# 미사키 event -> i -> ('node'|'ins', text노드id)
MAPPING = {
    '스카웃': {
        1: ('node', 'node_1787111769609_2_zy9n'),
        2: ('ins', 'node_1787111769609_1_4jm5'),
        3: ('ins', 'node_1787111769609_3_cdv3'),
        4: ('ins', 'node_1787111769609_5_eg92'),
        5: ('ins', 'node_1787111769609_16_660u'),
        6: ('ins', 'node_1787111769609_22_71jg'),
        7: ('ins', 'node_1787111769609_23_r5te'),
        8: ('ins', 'node_1787111769609_28_z2mw'),
        9: ('ins', 'node_1787111769609_30_kefo'),
        10: ('ins', 'node_1787111769609_36_2tmg'),
    },
    '데이트1': {
        1: ('node', 'node_1787112506729_0_ucct'),
        2: ('ins', 'node_1787112506729_4_7hpy'),
        3: ('ins', 'node_1787112506729_17_ywe8'),
        4: ('ins', 'node_1787112506729_21_pbvm'),
        5: ('node', 'node_1787112506729_22_ey6a'),
        6: ('ins', 'node_1787112506729_28_cubb'),
        7: ('ins', 'node_1787112506729_36_07s6'),
        8: ('node', 'node_1787112506729_35_z42s'),
    },
    '데이트2': {
        1: ('node', 'node_1787112976972_0_jdjq'),
        2: ('ins', 'node_1787112976972_17_zzjb'),
        3: ('ins', 'node_1787112976972_21_v6n5'),
        4: ('ins', 'node_1787112976972_25_j156'),
        5: ('node', 'node_1787112976972_30_z4pe'),
        6: ('ins', 'node_1787112976972_29_of00'),
        7: ('node', 'node_1787112976972_44_53ud'),
        8: ('node', 'node_1787112976972_53_d8ys'),
    },
    '섹스': {
        1: ('node', 'node_1787113705965_0_q1e4'),
        2: ('ins', 'node_1787113705965_4_2uwn'),
        3: ('ins', 'node_1787113705965_22_f9uf'),
        4: ('node', 'node_1787113705965_24_7fks'),
        5: ('node', 'node_1787113705965_33_cgss'),
        6: ('node', 'node_1787113705965_42_1n4m'),
        7: ('node', 'node_1787113705965_46_2tbz'),
        8: ('node', 'node_1787113705965_50_d3fc'),
        9: ('node', 'node_1787113705965_60_jzgw'),
    },
    '엔딩': {
        1: ('node', 'node_1786844399316_0_mzkt'),
        2: ('ins', 'node_1786844399316_3_saux'),
        3: ('node', 'node_1786844399316_18_ban1'),
        4: ('node', 'node_1786844399316_34_imie'),
        5: ('ins', 'node_1786844399316_38_c8jw'),
        6: ('node', 'node_1786844399316_51_eog0'),
        7: ('node', 'node_1786844399316_61_a0tl'),
    },
    'VIP': {
        1: ('node', 'node_1787115692563_0_jqad'),
        2: ('ins', 'node_1787115692563_3_6713'),
        3: ('node', 'node_1787115692563_13_4gjb'),
        4: ('node', 'node_1787115692563_16_tsda'),
        5: ('node', 'node_1787115692563_20_4637'),
        6: ('node', 'node_1787115692563_31_rx3r'),
        7: ('ins', 'node_1787115692563_36_9mwx'),
    },
}

m = json.load(open(os.path.join(BASE, '이미지_마스터.json'), encoding='utf-8'))
c = m['characters']['타치바나미사키']
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
print('이미지_마스터.json 미사키 매핑 수정 완료')
