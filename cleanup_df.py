import json, os, sqlite3

BASE = r'F:/Broadcast/broadcast-game'
delete = json.load(open(os.path.join(BASE, '_delete_candidates.json'), encoding='utf-8'))
print('삭제 대상 파일:', len(delete))

# 1. 파일 삭제
deleted_files = 0
missing = 0
for p in delete:
    # 경로는 소문자로 저장됨. Windows 대소문자 무관하므로 그대로 시도
    if os.path.exists(p):
        os.remove(p)
        deleted_files += 1
    else:
        # 드라이브 문자 대문자 변환 시도
        alt = p[0].upper() + p[1:]
        if os.path.exists(alt):
            os.remove(alt)
            deleted_files += 1
        else:
            missing += 1
print(f'파일 삭제: {deleted_files}개, 누락: {missing}개')

# 2. DB generations 행 삭제
db = r'C:/Users/shogu/AppData/Roaming/simpligen/simpligen.db'
con = sqlite3.connect(db)
cur = con.cursor()
delete_set = set(delete)
cur.execute('SELECT id, result_url FROM generations WHERE result_url IS NOT NULL')
rows = cur.fetchall()
to_delete = []
for gid, url in rows:
    if not url:
        continue
    p = url.replace('local-file:///', '').replace('file:///', '')
    p = os.path.normpath(p).replace('\\', '/').lower()
    if p in delete_set:
        to_delete.append(gid)
for gid in to_delete:
    cur.execute('DELETE FROM generations WHERE id=?', (gid,))
con.commit()
print(f'DB generations 행 삭제: {len(to_delete)}개')

# 잔여 확인
cur.execute('SELECT COUNT(*) FROM generations')
print('generations 잔여 행:', cur.fetchone()[0])
con.close()
