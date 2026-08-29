"""
PNG -> WebP 변환 스크립트 (게임 에셋 압축용)
사용법:
  python png2webp.py <src_dir> <dst_dir> [quality]
  (quality 기본 82, 생략 시 src 하위 webp/ 폴더로 출력)
"""
import os, sys, glob
from PIL import Image

def convert(src_dir, dst_dir, quality=82):
    os.makedirs(dst_dir, exist_ok=True)
    pngs = sorted(glob.glob(os.path.join(src_dir, "*.png")))
    if not pngs:
        print(f"PNG 없음: {src_dir}")
        return

    total_in = total_out = 0
    for p in pngs:
        name = os.path.splitext(os.path.basename(p))[0]
        out = os.path.join(dst_dir, name + ".webp")
        img = Image.open(p).convert("RGB")
        img.save(out, "WEBP", quality=quality, method=6)
        total_in += os.path.getsize(p)
        total_out += os.path.getsize(out)

    n = len(pngs)
    ratio = 100 * (1 - total_out / total_in) if total_in else 0
    print(f"변환 {n}장: {total_in/1e6:.2f}MB -> {total_out/1e6:.2f}MB ({ratio:.1f}% 감소, 평균 {total_out/n/1024:.0f}KB/장)")

if __name__ == "__main__":
    src = sys.argv[1] if len(sys.argv) > 1 else "F:/Ai/Simpligen/output/df/community--anima-anime-packanima-base-v1"
    dst = sys.argv[2] if len(sys.argv) > 2 else os.path.join(src, "webp")
    q = int(sys.argv[3]) if len(sys.argv) > 3 else 82
    convert(src, dst, q)
