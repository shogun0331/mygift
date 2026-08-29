import json, urllib.request, time, os

TOKEN = "sg-agent-cefef668d12c54664e4479813a7e83de06081201"
API = "http://localhost:48199"
PID = "f41c5812-95c2-471d-9f2a-02895ba1c3ea"
BASE = "F:/Broadcast/broadcast-game"

master = json.load(open(f"{BASE}/이미지_마스터.json", encoding="utf-8"))
SEEDS = master["seeds"]

# 리나 제외 8명
others = {k: v for k, v in master["characters"].items() if k != "미야자와리나"}

flat = []
for char, cdata in others.items():
    for ev, edata in cdata["events"].items():
        for cut in edata["cuts"]:
            flat.append((char, ev, cut))

print(f"리나 제외 {len(flat)}컷 디스패치 시작", flush=True)

def gen(cut, seed):
    payload = {"presetId": master["model"], "mediaType":"image", "backend":"local",
        "prompt": cut["prompt"], "project": PID,
        "options": {"aspectRatio":"16:9","steps":40,"cfg":5,
                    "negativePrompt": cut["negative"], "seed": seed}}
    data = json.dumps(payload).encode()
    req = urllib.request.Request(f"{API}/generate", data=data, method="POST")
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Content-Type", "application/json")
    return json.loads(urllib.request.urlopen(req, timeout=60).read())

# 기존 _jobs.json에서 리나 제외 캐릭터 기록 제거 (리나는 새 시드로 유지)
jp = f"{BASE}/_jobs.json"
rina_jobs = []
if os.path.exists(jp):
    alljobs = json.load(open(jp, encoding="utf-8"))["jobs"]
    rina_jobs = [j for j in alljobs if j.get("char") == "미야자와리나"]

jobs = list(rina_jobs)
ok = fail = 0
for idx, (char, ev, cut) in enumerate(flat, 1):
    seed = SEEDS[char]
    try:
        r = gen(cut, seed)
        jobs.append({"jobId": r.get("jobId"), "char": char, "event": ev, "i": cut["i"],
                     "node": cut["node"], "insert_after": cut["insert_after"], "seed": seed})
        ok += 1
    except Exception as e:
        fail += 1
        print(f"FAIL {char}/{ev}/{cut['i']}: {e}", flush=True)
    if idx % 25 == 0:
        json.dump({"jobs": jobs}, open(jp, "w", encoding="utf-8"), ensure_ascii=False)
        print(f"진행 {idx}/{len(flat)} (성공 {ok}, 실패 {fail})", flush=True)
        time.sleep(0.5)

json.dump({"jobs": jobs}, open(jp, "w", encoding="utf-8"), ensure_ascii=False)
print(f"DONE 리나외 {ok}컷 (실패 {fail}), 총 {len(jobs)} 잡 기록", flush=True)
