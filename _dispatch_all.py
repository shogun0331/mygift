import json, urllib.request, time, os

TOKEN = "sg-agent-cefef668d12c54664e4479813a7e83de06081201"
API = "http://localhost:48199"
PID = "f41c5812-95c2-471d-9f2a-02895ba1c3ea"
BASE = "F:/Broadcast/broadcast-game"
SEED = 987654321

master = json.load(open(f"{BASE}/이미지_마스터.json", encoding="utf-8"))

flat = []
for char, cdata in master["characters"].items():
    for ev, edata in cdata["events"].items():
        for cut in edata["cuts"]:
            flat.append((char, ev, cut))

print(f"총 {len(flat)}컷 디스패치 (seed {SEED})", flush=True)

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
for idx, (char, ev, cut) in enumerate(flat, 1):
    try:
        r = gen(cut)
        # 파일명(jobId) -> 프롬프트/네거티브/노드/비트 전부 매핑 저장
        jobs.append({
            "jobId": r.get("jobId"),
            "char": char, "event": ev, "i": cut["i"], "beat": cut["beat"],
            "node": cut["node"], "insert_after": cut["insert_after"],
            "seed": SEED,
            "prompt": cut["prompt"], "negative": cut["negative"],
        })
        ok += 1
    except Exception as e:
        fail += 1
        print(f"FAIL {char}/{ev}/{cut['i']}: {e}", flush=True)
    if idx % 25 == 0:
        json.dump({"jobs": jobs}, open(f"{BASE}/_jobs.json", "w", encoding="utf-8"), ensure_ascii=False)
        print(f"진행 {idx}/{len(flat)} (성공 {ok}, 실패 {fail})", flush=True)
        time.sleep(0.5)

json.dump({"jobs": jobs}, open(f"{BASE}/_jobs.json", "w", encoding="utf-8"), ensure_ascii=False)
print(f"DONE 총 {len(jobs)} 잡 (성공 {ok}, 실패 {fail})", flush=True)
