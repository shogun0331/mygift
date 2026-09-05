#!/usr/bin/env python3
"""방송국 스탭 40명 × (1:1 아이콘 + 3:4 카드) = 80장 dispatch."""
import json
import urllib.request

TOKEN = "sg-agent-2eb58c49965771c489071cb409966915b8da6fb1"
BASE = "http://127.0.0.1:48199"
PROJECT = "b1d767b5-5672-4237-9c64-ebcf4f393f38"
PRESET = "community--anima-anime-pack:anima-base-v1"

QUALITY = (
    "masterpiece, best quality, highres, newest, 3d, cgi, realistic lighting, "
    "detailed face, detailed eyes, detailed hair"
)
LIGHTING = (
    "soft even studio lighting, professional portrait lighting, "
    "gentle key light from camera-left, subtle fill light, no harsh shadows, "
    "consistent warm-neutral color temperature, hair rim light"
)
ICON_FRAME = (
    "portrait, headshot, close-up, face focus, looking at viewer, "
    "head and shoulders, simple beige studio backdrop, plain background, "
    "shallow depth of field, no people, empty hands"
)
CARD_FRAME = (
    "upper body, waist-up, looking at viewer, standing, "
    "shallow depth of field, no people, empty hands, nothing in hands"
)

UNIFORMS = {
    "security": (
        "navy blue security uniform, collared navy button-up shirt, black necktie, "
        "gold epaulets, SECURITY chest patch, circular sleeve badge, "
        "black belt with silver buckle, professional security staff uniform"
    ),
    "repair": (
        "charcoal work shirt, amber orange utility vest, tool pouches on vest, "
        "MAINTENANCE chest patch, utility belt, work technician uniform"
    ),
    "care": (
        "white inner collared shirt, mint green care staff tunic, "
        "ID lanyard around neck, CARE embroidered badge, soft round collar, "
        "talent care staff uniform"
    ),
    "production": (
        "black production jacket, violet piping on collar and cuffs, "
        "dark shirt underneath, headset over one ear, PRODUCTION logo on chest, "
        "lanyard with badge, studio production crew uniform"
    ),
}

CARD_BG = {
    "security": "blurred station lobby hallway, beige walls, reception bokeh, indoor",
    "repair": "blurred equipment workshop, cables and gear bokeh, warm gray walls, amber work light, indoor",
    "care": "blurred lounge rest area, indoor plants, cream walls, soft green ambient light, indoor",
    "production": "blurred control room, monitor glow bokeh, dim cool studio lighting, indoor",
}

NEG_SHARED = (
    "lowres, worst quality, bad anatomy, bad hands, extra fingers, extra limbs, "
    "deformed, disfigured, jpeg artifacts, watermark, text, signature, censored, mosaic, "
    "multiple people, 2girls, 2boys, extra people, crowd, nsfw, nude, nipples, cleavage, "
    "skimpy clothes, extra eyes, mutated, ugly, poorly drawn face, long neck, cropped, "
    "out of frame, duplicate, bad proportions, extra arms, extra legs, animal ears, "
    "loli, child, chibi, western cartoon, sketch, monochrome, greyscale, hat, helmet, "
    "mask, sunglasses, armor, futuristic, casual t-shirt, hoodie, pajamas, "
    "inconsistent lighting, harsh shadows, overexposed, underexposed"
)
NEG_F = NEG_SHARED + ", 1boy, male, man, stubble, beard, adam's apple, masculine face"
NEG_M = NEG_SHARED + ", 1girl, female, woman, breasts, feminine face, lipstick, makeup"

# 인물당 identity는 1:1 / 3:4 공용. seed도 공용.
STAFF = [
    # —— 보안 여 5 ——
    dict(id="security_f01", kind="security", gender="female", name="타카하시 아야", seed=1101001,
         identity="1girl, solo, adult woman, black hair, ponytail, bangs, brown eyes, oval face, arched eyebrows, fair skin, long eyelashes, small nose, slight professional smile"),
    dict(id="security_f02", kind="security", gender="female", name="스즈키 하나", seed=1101002,
         identity="1girl, solo, adult woman, dark brown hair, bob cut, blunt bangs, center part, hazel eyes, round face, thin eyebrows, light skin, calm expression"),
    dict(id="security_f03", kind="security", gender="female", name="와타나베 린", seed=1101003,
         identity="1girl, solo, adult woman, black hair, long hair, straight hair, dark gray eyes, long face, thick straight eyebrows, fair skin, serious expression, sharp eyes"),
    dict(id="security_f04", kind="security", gender="female", name="오카다 에미", seed=1101004,
         identity="1girl, solo, adult woman, chestnut hair, hair bun, low bun, sidelocks, amber eyes, heart-shaped face, arched eyebrows, warm skin, gentle smile"),
    dict(id="security_f05", kind="security", gender="female", name="후쿠다 사야", seed=1101005,
         identity="1girl, solo, adult woman, black hair, hime cut, straight bangs, green eyes, pointed chin, short eyebrows, pale skin, cool expression"),
    # —— 보안 남 5 ——
    dict(id="security_m01", kind="security", gender="male", name="타나카 하루토", seed=1102001,
         identity="1boy, solo, adult man, black hair, short hair, two-block haircut, brown eyes, angular jaw, thick eyebrows, fair skin, confident expression"),
    dict(id="security_m02", kind="security", gender="male", name="이노우에 렌", seed=1102002,
         identity="1boy, solo, adult man, dark brown hair, undercut, textured quiff, gray eyes, oval face, straight thick eyebrows, light skin, calm expression"),
    dict(id="security_m03", kind="security", gender="male", name="키무라 소타", seed=1102003,
         identity="1boy, solo, adult man, black hair, slicked back, black eyes, square jaw, furrowed eyebrows, tan-fair skin, serious expression"),
    dict(id="security_m04", kind="security", gender="male", name="고토 다이키", seed=1102004,
         identity="1boy, solo, adult man, ash brown hair, short wavy hair, hazel eyes, round face, thin eyebrows, fair skin, slight smile"),
    dict(id="security_m05", kind="security", gender="male", name="니시무라 케이", seed=1102005,
         identity="1boy, solo, adult man, black hair, side part, neat hair, dark blue eyes, long face, thick arched eyebrows, fair skin, professional expression"),
    # —— 수리 여 5 ——
    dict(id="repair_f01", kind="repair", gender="female", name="이토 사키", seed=1201001,
         identity="1girl, solo, adult woman, brown hair, short ponytail, side bangs, amber eyes, oval face, thick eyebrows, light skin, cheerful slight smile"),
    dict(id="repair_f02", kind="repair", gender="female", name="야마모토 유이", seed=1201002,
         identity="1girl, solo, adult woman, black hair, messy short hair, tomboy, gray eyes, round face, short eyebrows, fair skin, focused expression"),
    dict(id="repair_f03", kind="repair", gender="female", name="나카무라 메이", seed=1201003,
         identity="1girl, solo, adult woman, dark blonde hair, medium hair, layered hair, green eyes, heart-shaped face, arched eyebrows, fair skin, confident smile"),
    dict(id="repair_f04", kind="repair", gender="female", name="오노 미카", seed=1201004,
         identity="1girl, solo, adult woman, dark brown hair, braid, single braid over shoulder, brown eyes, long face, straight eyebrows, warm skin, calm expression"),
    dict(id="repair_f05", kind="repair", gender="female", name="타케우치 아오이", seed=1201005,
         identity="1girl, solo, adult woman, black hair, pixie cut, dark blue eyes, pointed chin, thin eyebrows, pale skin, sharp expression"),
    # —— 수리 남 5 ——
    dict(id="repair_m01", kind="repair", gender="male", name="하야시 카이토", seed=1202001,
         identity="1boy, solo, adult man, black hair, messy short hair, spiked hair, brown eyes, angular jaw, thick eyebrows, light stubble, focused expression"),
    dict(id="repair_m02", kind="repair", gender="male", name="시미즈 유토", seed=1202002,
         identity="1boy, solo, adult man, dark brown hair, crew cut, hazel eyes, round face, short eyebrows, fair skin, friendly smile"),
    dict(id="repair_m03", kind="repair", gender="male", name="야마구치 히로토", seed=1202003,
         identity="1boy, solo, adult man, black hair, high fade, longer top, gray eyes, square jaw, thick straight eyebrows, tan-fair skin, serious expression"),
    dict(id="repair_m04", kind="repair", gender="male", name="하라다 준", seed=1202004,
         identity="1boy, solo, adult man, chestnut hair, medium hair, bangs, green eyes, oval face, thin eyebrows, fair skin, slight smile"),
    dict(id="repair_m05", kind="repair", gender="male", name="엔도 리쿠", seed=1202005,
         identity="1boy, solo, adult man, silver hair, short hair, black eyes, long face, thick eyebrows, pale skin, mature male, calm expression"),
    # —— 케어 여 5 ——
    dict(id="care_f01", kind="care", gender="female", name="코바야시 나오", seed=1301001,
         identity="1girl, solo, adult woman, dark brown hair, bob cut, center part, light brown eyes, round face, thin arched eyebrows, fair skin, gentle smile"),
    dict(id="care_f02", kind="care", gender="female", name="카토 리카", seed=1301002,
         identity="1girl, solo, adult woman, black hair, long wavy hair, amber eyes, oval face, soft eyebrows, light skin, warm kind expression"),
    dict(id="care_f03", kind="care", gender="female", name="요시다 히나", seed=1301003,
         identity="1girl, solo, adult woman, chestnut hair, twin low buns, bangs, green eyes, heart-shaped face, short eyebrows, fair skin, bright smile"),
    dict(id="care_f04", kind="care", gender="female", name="우에노 유나", seed=1301004,
         identity="1girl, solo, adult woman, black hair, high bun, wispy bangs, gray eyes, long face, arched eyebrows, pale skin, calm gentle expression"),
    dict(id="care_f05", kind="care", gender="female", name="미야모토 시오리", seed=1301005,
         identity="1girl, solo, adult woman, ash brown hair, long hair, side part, dark blue eyes, oval face, thick eyebrows, fair skin, quiet smile"),
    # —— 케어 남 5 ——
    dict(id="care_m01", kind="care", gender="male", name="마츠모토 렌야", seed=1302001,
         identity="1boy, solo, adult man, dark brown hair, neat short hair, side part, brown eyes, oval face, soft thick eyebrows, fair skin, gentle smile"),
    dict(id="care_m02", kind="care", gender="male", name="아베 켄토", seed=1302002,
         identity="1boy, solo, adult man, black hair, medium hair, curtain bangs, hazel eyes, round face, thin eyebrows, light skin, kind expression"),
    dict(id="care_m03", kind="care", gender="male", name="이시다 료", seed=1302003,
         identity="1boy, solo, adult man, black hair, short hair, two-block, gray eyes, angular jaw, straight eyebrows, fair skin, calm professional expression"),
    dict(id="care_m04", kind="care", gender="male", name="오가와 타쿠미", seed=1302004,
         identity="1boy, solo, adult man, dark blonde hair, textured crop, green eyes, oval face, arched eyebrows, fair skin, warm smile"),
    dict(id="care_m05", kind="care", gender="male", name="사카모토 하루키", seed=1302005,
         identity="1boy, solo, adult man, brown hair, wavy short hair, amber eyes, soft jaw, thick eyebrows, light skin, gentle expression"),
    # —— 프로덕션 여 5 ——
    dict(id="production_f01", kind="production", gender="female", name="야마다 미오", seed=1401001,
         identity="1girl, solo, adult woman, black hair, wolf cut, medium hair, dark brown eyes, oval face, thick eyebrows, fair skin, confident expression"),
    dict(id="production_f02", kind="production", gender="female", name="사사키 코토네", seed=1401002,
         identity="1girl, solo, adult woman, wine red hair, long hair, side part, amber eyes, heart-shaped face, arched eyebrows, pale skin, slight smirk"),
    dict(id="production_f03", kind="production", gender="female", name="사토 미유", seed=1401003,
         identity="1girl, solo, adult woman, dark brown hair, bob cut, side swept bangs, gray eyes, round face, thin eyebrows, light skin, focused expression"),
    dict(id="production_f04", kind="production", gender="female", name="키쿠치 나나", seed=1401004,
         identity="1girl, solo, adult woman, black hair, short bob, straight bangs, green eyes, pointed chin, short eyebrows, fair skin, energetic smile"),
    dict(id="production_f05", kind="production", gender="female", name="호리 아야카", seed=1401005,
         identity="1girl, solo, adult woman, dirty blonde hair, half-up hair, long hair, dark blue eyes, long face, thick arched eyebrows, fair skin, cool expression"),
    # —— 프로덕션 남 5 ——
    dict(id="production_m01", kind="production", gender="male", name="모리 다이치", seed=1402001,
         identity="1boy, solo, adult man, black hair, short textured hair, swept up, dark brown eyes, defined jaw, thick eyebrows, light stubble, calm professional expression"),
    dict(id="production_m02", kind="production", gender="male", name="이케다 쇼타", seed=1402002,
         identity="1boy, solo, adult man, dark brown hair, messy bedhead short hair, hazel eyes, oval face, thin eyebrows, fair skin, playful slight smile"),
    dict(id="production_m03", kind="production", gender="male", name="후지타 마코토", seed=1402003,
         identity="1boy, solo, adult man, black hair, slicked back, gray eyes, square jaw, furrowed thick eyebrows, tan-fair skin, serious expression"),
    dict(id="production_m04", kind="production", gender="male", name="나가이 소스케", seed=1402004,
         identity="1boy, solo, adult man, ash brown hair, medium hair, curtain bangs, green eyes, long face, arched eyebrows, pale skin, focused expression"),
    dict(id="production_m05", kind="production", gender="male", name="무라카미 렌", seed=1402005,
         identity="1boy, solo, adult man, black hair, undercut, faded sides, amber eyes, angular jaw, thick straight eyebrows, fair skin, confident smile"),
]


def build_prompt(person, shot):
    parts = [
        QUALITY,
        person["identity"],
        UNIFORMS[person["kind"]],
        LIGHTING,
    ]
    if shot == "icon":
        parts.append(ICON_FRAME)
    else:
        parts.append(CARD_FRAME)
        parts.append(CARD_BG[person["kind"]])
    return ", ".join(parts)


def generate(prompt, negative, seed, ratio):
    payload = json.dumps({
        "presetId": PRESET,
        "mediaType": "image",
        "prompt": prompt,
        "options": {
            "aspectRatio": ratio,
            "steps": 40,
            "cfg": 5,
            "negativePrompt": negative,
            "seed": seed,
        },
        "backend": "local",
        "project": PROJECT,
    }).encode()
    req = urllib.request.Request(BASE + "/generate", data=payload, method="POST")
    req.add_header("Authorization", "Bearer " + TOKEN)
    req.add_header("Content-Type", "application/json")
    with urllib.request.urlopen(req, timeout=30) as res:
        return json.loads(res.read()).get("jobId")


def main():
    results = []
    for person in STAFF:
        neg = NEG_F if person["gender"] == "female" else NEG_M
        for shot, ratio in (("icon", "1:1"), ("card", "3:4")):
            prompt = build_prompt(person, shot)
            job_id = generate(prompt, neg, person["seed"], ratio)
            row = {
                "id": person["id"],
                "name": person["name"],
                "kind": person["kind"],
                "gender": person["gender"],
                "shot": shot,
                "ratio": ratio,
                "seed": person["seed"],
                "jobId": job_id,
                "prompt": prompt,
                "negative": neg,
            }
            results.append(row)
            print(f"{person['id']:16} {shot:4} {job_id}")
    out = r"F:/Broadcast/broadcast-game/_staff_jobs.json"
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"project": PROJECT, "preset": PRESET, "count": len(results), "jobs": results}, f, ensure_ascii=False, indent=2)
    print(f"dispatch 완료: {len(results)}장 → {out}")


if __name__ == "__main__":
    main()
