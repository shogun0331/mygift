#!/usr/bin/env python3
"""스탭 80장 완료 확인 → 타입 폴더 정리 → WebP 변환.

사용:
  python organize_staff.py --check     # 진행만 확인
  python organize_staff.py             # 전부 완료면 정리+WebP
  python organize_staff.py --partial   # 완성된 것만 정리+WebP
"""
import json
import os
import sys
import urllib.request

from PIL import Image

TOKEN = "sg-agent-2eb58c49965771c489071cb409966915b8da6fb1"
SG_BASE = "http://127.0.0.1:48199"
JOBS_PATH = r"F:/Broadcast/broadcast-game/_staff_jobs.json"
OUT_ROOT = r"F:/Broadcast/broadcast-game/_staff_out"
WEBP_QUALITY = 92
WEBP_METHOD = 6

KIND_DIR = {
    "security": "보안스탭",
    "repair": "수리스탭",
    "care": "케어스탭",
    "production": "프로덕션스탭",
}
SHOT_FILE = {
    "icon": "아이콘.webp",
    "card": "카드.webp",
}


def sg_job(job_id):
    req = urllib.request.Request(f"{SG_BASE}/jobs/{job_id}")
    req.add_header("Authorization", "Bearer " + TOKEN)
    with urllib.request.urlopen(req, timeout=20) as res:
        return json.loads(res.read()).get("job", {})


def person_dir(kind, name):
    return os.path.join(OUT_ROOT, KIND_DIR[kind], name.replace(" ", "_"))


def save_webp(src, dst):
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    img = Image.open(src).convert("RGB")
    img.save(dst, "WEBP", quality=WEBP_QUALITY, method=WEBP_METHOD)


def refresh(data):
    jobs = data["jobs"]
    counts = {"completed": 0, "failed": 0, "pending": 0, "other": 0}
    for j in jobs:
        job = sg_job(j["jobId"])
        status = job.get("status") or "unknown"
        j["status"] = status
        j["resultPath"] = job.get("resultPath")
        j["errorMessage"] = job.get("errorMessage")
        if status == "completed":
            counts["completed"] += 1
        elif status == "failed":
            counts["failed"] += 1
        elif status in ("pending", "queued", "processing"):
            counts["pending"] += 1
        else:
            counts["other"] += 1
    with open(JOBS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    return counts


def convert(jobs):
    done = 0
    skipped = 0
    png_bytes = 0
    webp_bytes = 0
    for j in jobs:
        if j.get("status") != "completed" or not j.get("resultPath"):
            skipped += 1
            continue
        src = j["resultPath"]
        if not os.path.isfile(src):
            print(f"파일 없음: {j['id']} {j['shot']} {src}")
            skipped += 1
            continue
        dst = os.path.join(person_dir(j["kind"], j["name"]), SHOT_FILE[j["shot"]])
        save_webp(src, dst)
        j["webpPath"] = dst
        png_bytes += os.path.getsize(src)
        webp_bytes += os.path.getsize(dst)
        done += 1
        print(f"{KIND_DIR[j['kind']]}/{j['name'].replace(' ', '_')} {SHOT_FILE[j['shot']]}")
    return done, skipped, png_bytes, webp_bytes


def main():
    check_only = "--check" in sys.argv
    partial = "--partial" in sys.argv
    with open(JOBS_PATH, encoding="utf-8") as f:
        data = json.load(f)
    counts = refresh(data)
    total = len(data["jobs"])
    print(
        f"상태: 완료 {counts['completed']}/{total}  "
        f"대기 {counts['pending']}  실패 {counts['failed']}  기타 {counts['other']}"
    )
    if check_only:
        return 0
    if counts["failed"]:
        print("실패 잡이 있습니다. --partial 로 완성분만 정리할 수 있습니다.")
        if not partial:
            return 1
    if counts["completed"] < total and not partial:
        print("아직 전부 끝나지 않았습니다. 끝나면 다시 실행하거나 --partial 을 쓰세요.")
        return 1
    done, skipped, png_bytes, webp_bytes = convert(data["jobs"])
    with open(JOBS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    ratio = 100 * (1 - webp_bytes / png_bytes) if png_bytes else 0
    print(f"WebP {done}장 ({skipped} 건너뜀) → {OUT_ROOT}")
    if png_bytes:
        print(f"용량: {png_bytes/1e6:.2f}MB PNG → {webp_bytes/1e6:.2f}MB WebP ({ratio:.1f}% 감소)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
