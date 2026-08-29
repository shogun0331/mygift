import json, urllib.request, time

TOKEN = "sg-agent-cefef668d12c54664e4479813a7e83de06081201"
API = "http://localhost:48199"
PID = "f41c5812-95c2-471d-9f2a-02895ba1c3ea"
BASE = "F:/Broadcast/broadcast-game"
SEED = 987654321

master = json.load(open(f"{BASE}/이미지_마스터.json", encoding="utf-8"))
mg = master["characters"]["타치바나미사키"]

flat = [(ev, cut) for ev, edata in mg["events"].items() for cut in edata["cuts"]]
print(f"미사키 {len(flat)}컷 재디스패치 (warm tan skin 고정)", flush=True)

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

newjobs = []
ok = fail = 0
for ev, cut in flat:
    try:
        r = gen(cut)
        newjobs.append({"jobId": r.get("jobId"), "char": "타치바나미사키", "event": ev, "i": cut["i"],
                        "beat": cut["beat"], "node": cut["node"], "insert_after": cut["insert_after"],
                        "seed": SEED, "prompt": cut["prompt"], "negative": cut["negative"]})
        ok += 1
    except Exception as e:
        fail += 1
        print(f"FAIL {ev}/{cut['i']}: {e}", flush=True)
    time.sleep(0.05)

# _jobs.json에서 미사키 기존 기록 제거 후 새로 추가
import os
jp = f"{BASE}/_jobs.json"
if os.path.exists(jp):
    allj = json.load(open(jp, encoding="utf-8"))["jobs"]
else:
    allj = []
allj = [j for j in allj if j.get("char") != "타치바나미사키"]
json.dump({"jobs": allj + newjobs}, open(jp, "w", encoding="utf-8"), ensure_ascii=False)
print(f"미사키 재디스패치 완료: {ok}컷 (실패 {fail})", flush=True)
