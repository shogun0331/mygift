import json, urllib.request, time, os

TOKEN = "sg-agent-cefef668d12c54664e4479813a7e83de06081201"
API = "http://localhost:48199"
PID = "f41c5812-95c2-471d-9f2a-02895ba1c3ea"
BASE = "F:/Broadcast/broadcast-game"

master = json.load(open(f"{BASE}/이미지_마스터.json", encoding="utf-8"))
SEEDS = master["seeds"]

jp = f"{BASE}/_jobs.json"
existing = []
done = set()
if os.path.exists(jp):
    existing = json.load(open(jp, encoding="utf-8"))["jobs"]
    for j in existing:
        done.add((j["char"], j["event"], j["i"]))

flat = []
for char, cdata in master["characters"].items():
    for ev, edata in cdata["events"].items():
        for cut in edata["cuts"]:
            flat.append((char, ev, cut))

jobs = list(existing)
todo = [(c, e, cu) for (c, e, cu) in flat if (c, e, cu["i"]) not in done]
print(f"총 {len(flat)} 중 남은 {len(todo)} 컷 디스패치 시작", flush=True)

def gen(c, e, cut, seed):
    payload = {"presetId": master["model"], "mediaType":"image", "backend":"local",
        "prompt": cut["prompt"], "project": PID,
        "options": {"aspectRatio":"16:9","steps":40,"cfg":5,
                    "negativePrompt": cut["negative"], "seed": seed}}
    data = json.dumps(payload).encode()
    req = urllib.request.Request(f"{API}/generate", data=data, method="POST")
    req.add_header("Authorization", f"Bearer {TOKEN}")
    req.add_header("Content-Type", "application/json")
    return json.loads(urllib.request.urlopen(req, timeout=60).read())

ok = fail = 0
for idx, (c, e, cut) in enumerate(todo, 1):
    seed = SEEDS[c]
    try:
        r = gen(c, e, cut, seed)
        jobs.append({"jobId": r.get("jobId"), "char": c, "event": e, "i": cut["i"],
                     "node": cut["node"], "insert_after": cut["insert_after"], "seed": seed})
        ok += 1
    except Exception as ex:
        fail += 1
        print(f"FAIL {c}/{e}/{cut['i']}: {ex}", flush=True)
    if idx % 25 == 0:
        json.dump({"jobs": jobs}, open(jp,"w",encoding="utf-8"), ensure_ascii=False)
        print(f"진행 {idx}/{len(todo)} (성공 {ok}, 실패 {fail})", flush=True)
        time.sleep(0.5)

json.dump({"jobs": jobs}, open(jp,"w",encoding="utf-8"), ensure_ascii=False)
print(f"DONE 총 {len(jobs)} 잡 (성공 {ok}, 실패 {fail})", flush=True)
