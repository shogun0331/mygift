import json, urllib.request, time, os

TOKEN = "sg-agent-cefef668d12c54664e4479813a7e83de06081201"
API = "http://localhost:48199"
PID = "f41c5812-95c2-471d-9f2a-02895ba1c3ea"
BASE = "F:/Broadcast/broadcast-game"
SEED = 987654321

master = json.load(open(f"{BASE}/이미지_마스터.json", encoding="utf-8"))
mg = master["characters"]["타치바나미사키"]

targets = [(ev, cut) for ev, edata in mg["events"].items() for cut in edata["cuts"]
           if "warm indoor lighting" in cut["prompt"]]
print(f"미사키 H씬 재생성 {len(targets)}컷", flush=True)

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

# _jobs.json에서 미사키 H씬 기존 기록 교체
jp = f"{BASE}/_jobs.json"
m = json.load(open(jp, encoding="utf-8"))
allj = m["jobs"]
# 기존 미사키 H씬(섹스/데이트2 H/엔딩/VIP) 기록 제거
allj = [j for j in allj if not (j.get("char")=="타치바나미사키" and
        any(j.get("event")==ev for ev in ["섹스","데이트2","엔딩","VIP"]))]

newjobs = []
ok = fail = 0
for ev, cut in targets:
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

json.dump({"jobs": allj + newjobs}, open(jp, "w", encoding="utf-8"), ensure_ascii=False)
print(f"미사키 H씬 재생성 완료: {ok}컷 (실패 {fail})", flush=True)
