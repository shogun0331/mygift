import json, urllib.request, time

TOKEN = "sg-agent-cefef668d12c54664e4479813a7e83de06081201"
API = "http://localhost:48199"
PID = "f41c5812-95c2-471d-9f2a-02895ba1c3ea"
BASE = "F:/Broadcast/broadcast-game"
SEED = 5484

master = json.load(open(f"{BASE}/이미지_마스터.json", encoding="utf-8"))
master["seeds"]["미야자와리나"] = SEED
json.dump(master, open(f"{BASE}/이미지_마스터.json","w",encoding="utf-8"), ensure_ascii=False, indent=1)

rina = master["characters"]["미야자와리나"]
flat = []
for ev, edata in rina["events"].items():
    for cut in edata["cuts"]:
        flat.append((ev, cut))

print(f"리나 {len(flat)}컷 디스패치 (seed {SEED})", flush=True)

def gen(cut):
    payload = {"presetId": master["model"], "mediaType":"image", "backend":"local",
        "prompt": cut["prompt"], "project": PID,
        "options": {"aspectRatio":"16:9","steps":40,"cfg":5,
                    "negativePrompt": cut["negative"], "seed": SEED}}
    data = json.dumps(payload).encode()
    req = urllib.request.Request(f"{API}/generate", data=data, method="POST")
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Content-Type", "application/json")
    return json.loads(urllib.request.urlopen(req, timeout=60).read())

jobs = []
ok = fail = 0
for idx, (ev, cut) in enumerate(flat, 1):
    try:
        r = gen(cut)
        jobs.append({"jobId": r.get("jobId"), "char": "미야자와리나", "event": ev, "i": cut["i"],
                     "node": cut["node"], "insert_after": cut["insert_after"], "seed": SEED})
        ok += 1
    except Exception as e:
        fail += 1
        print(f"FAIL {ev}/{cut['i']}: {e}", flush=True)
    if idx % 20 == 0:
        print(f"진행 {idx}/{len(flat)}", flush=True)
        time.sleep(0.3)

# 기존 _jobs.json에 리나 부분 갱신 저장
jp = f"{BASE}/_jobs.json"
import os
if os.path.exists(jp):
    old = json.load(open(jp, encoding="utf-8"))["jobs"]
else:
    old = []
# 리나 이전 기록 제거 후 새로 추가
old = [j for j in old if j.get("char") != "미야자와리나"]
json.dump({"jobs": old + jobs}, open(jp, "w", encoding="utf-8"), ensure_ascii=False)
print(f"DONE 리나 {ok}컷 (실패 {fail})", flush=True)
