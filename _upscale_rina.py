import json, urllib.request, base64, os, time

TOKEN = "sg-agent-cefef668d12c54664e4479813a7e83de06081201"
API = "http://localhost:48199"
CID = "276168f6-4783-4a2e-bebb-2533efed3136"
BASE = "F:/Broadcast/broadcast-game"
PRESET = "upscale-pack:rtx-upscale-image"

def req(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(f"{API}{path}", data=data, method=method)
    r.add_header("Authorization", f"Bearer {TOKEN}")
    if data: r.add_header("Content-Type", "application/json")
    return json.loads(urllib.request.urlopen(r, timeout=120).read())

m = json.load(open(f"{BASE}/_jobs.json", encoding="utf-8"))
rina = [j for j in m["jobs"] if j["char"] == "미야자와리나" and j.get("file")]
print(f"리나 업스케일 {len(rina)}장 시작", flush=True)

enhance_map = []
ok = fail = 0
for j in rina:
    fpath = j["resultPath"] or j["file"]
    # resultPath가 없으면 출력 폴더에서 찾기
    if not os.path.isabs(fpath):
        fpath = f"F:/Ai/Simpligen/output/df/community--anima-anime-packanima-base-v1/{j['file']}"
    if not os.path.exists(fpath):
        fail += 1
        print(f"파일없음: {fpath}", flush=True)
        continue
    try:
        with open(fpath, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        up = req("POST", "/uploads", {"filename": os.path.basename(fpath), "dataBase64": b64})
        enh = req("POST", f"/characters/{CID}/enhance", {
            "filePath": up["handle"], "scale": 2, "presetId": PRESET, "mediaType": "image"})
        enhance_map.append({"enhanceJobId": enh.get("jobId"), "origFile": j["file"],
                            "char": j["char"], "event": j["event"], "i": j["i"], "beat": j["beat"],
                            "node": j.get("node"), "insert_after": j.get("insert_after")})
        ok += 1
    except Exception as e:
        fail += 1
        print(f"FAIL {j['event']}/#{j['i']}: {e}", flush=True)
    time.sleep(0.1)

json.dump(enhance_map, open(f"{BASE}/_enhance_jobs.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"업스케일 디스패치 완료: {ok}장 (실패 {fail})", flush=True)
