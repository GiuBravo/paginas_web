import os
import imageio.v3 as iio
from PIL import Image

src = r"c:\Users\giubr\Downloads\WhatsApp Video 2026-05-07 at 15.15.18.mp4"
out_dir = r"c:\Users\giubr\Cursor\tmp_video_frames"
os.makedirs(out_dir, exist_ok=True)

meta = iio.immeta(src)
fps = float(meta.get('fps') or 30)
step = int(max(1, round(fps * 0.5)))

idx = 0
for frame_i, frame in enumerate(iio.imiter(src)):
    if frame_i % step != 0:
        continue
    img = Image.fromarray(frame)
    img = img.convert('RGB')
    img.thumbnail((720, 1280))
    idx += 1
    img.save(os.path.join(out_dir, f"frame_{idx:03d}.png"))
    if idx >= 30:
        break
print('wrote', idx, 'frames to', out_dir)
