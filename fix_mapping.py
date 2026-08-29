import json, os

BASE = r'F:/Broadcast/broadcast-game'

# event -> i -> ('node'|'ins', 노드id)
MAPPING = {
    '스카웃': {
        1: ('node', 'node_1787102874671_2_vayg'),
        2: ('ins', 'node_1787102874671_10_ydsk'),
        3: ('ins', 'node_1787102874671_5_ki2w'),
        4: ('ins', 'node_1787102874671_7_7akn'),
        5: ('ins', 'node_1787102874671_14_xa4w'),
        6: ('ins', 'node_1787102874671_17_vpdg'),
        7: ('ins', 'node_1787102874671_21_62ha'),
        8: ('ins', 'node_1787102874671_22_4ikr'),
        9: ('ins', 'node_1787102874671_27_ubxu'),
        10: ('ins', 'node_1787102874671_29_2754'),
        11: ('ins', 'node_1787102874671_35_evwx'),
    },
    '데이트1': {
        1: ('node', 'node_1787096693202_1_l561'),
        2: ('ins', 'node_1787096693202_2_hm1d'),
        3: ('ins', 'node_1787096693202_20_mqf7'),
        4: ('ins', 'node_1787096693202_21_1ijo'),
        5: ('node', 'node_1787096693202_22_5o82'),
        6: ('ins', 'node_1787096693202_24_cu3e'),
        7: ('ins', 'node_1787096693202_28_f5nf'),
        8: ('node', 'node_1787096693202_30_b0zt'),
        9: ('ins', 'node_1787096693202_47_o1hp'),
    },
    '데이트2': {
        1: ('node', 'node_1787097515369_0_s6at'),
        2: ('ins', 'node_1787097515369_16_tf6w'),
        3: ('ins', 'node_1787097515369_20_3wio'),
        4: ('ins', 'node_1787097515369_25_gr4r'),
        5: ('node', 'node_1787097594290_0gze'),
        6: ('ins', 'node_1787097515369_38_wghv'),
        7: ('node', 'node_1787097515369_45_0lqo'),
        8: ('node', 'node_1787097515369_56_ujf7'),
        9: ('node', 'node_1787097515369_59_skin'),
    },
    '섹스': {
        1: ('node', 'node_1787100604876_0_iacj'),
        2: ('ins', 'node_1787100604876_4_xuqx'),
        3: ('ins', 'node_1787100604876_23_6b53'),
        4: ('node', 'node_1787100604876_25_xqjg'),
        5: ('node', 'node_1787100604876_34_ggoj'),
        6: ('node', 'node_1787100604876_44_udmn'),
        7: ('node', 'node_1787100604876_51_5ujw'),
        8: ('node', 'node_1787100604876_54_0dao'),
        9: ('ins', 'node_1787100604876_59_u2qi'),
        10: ('node', 'node_1787100604876_68_g1ri'),
    },
    '엔딩': {
        1: ('node', 'node_1786843238702_0_kbdm'),
        2: ('ins', 'node_1786843238702_3_84so'),
        3: ('node', 'node_1786843238702_18_5oi7'),
        4: ('ins', 'node_1786843238702_32_xe89'),
        5: ('node', 'node_1786843238702_34_ilc3'),
        6: ('ins', 'node_1786843238702_38_b2z3'),
        7: ('ins', 'node_1786843238702_47_rb4a'),
        8: ('node', 'node_1786843238702_51_2pbt'),
        9: ('node', 'node_1786843238702_61_0nu9'),
    },
}

# 1. _enhance_jobs.json 수정
enh_path = os.path.join(BASE, '_enhance_jobs.json')
enh = json.load(open(enh_path, encoding='utf-8'))
for e in enh:
    ev, i = e['event'], e['i']
    if ev in MAPPING and i in MAPPING[ev]:
        kind, val = MAPPING[ev][i]
        if kind == 'node':
            e['node'], e['insert_after'] = val, None
        else:
            e['node'], e['insert_after'] = None, val
json.dump(enh, open(enh_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('enhance_jobs 수정 완료')

# 2. 이미지_마스터.json 수정
master_path = os.path.join(BASE, '이미지_마스터.json')
m = json.load(open(master_path, encoding='utf-8'))
c = m['characters']['미야자와리나']
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
json.dump(m, open(master_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
print('이미지_마스터 수정 완료')
