"""Remove flat backgrounds from game UI icons and export transparent PNGs."""

from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSETS = Path(
    r"C:\Users\giubr\.cursor\projects\c-Users-giubr-Cursor-Lyssa\assets"
)
OUT_DIR = ROOT / "public" / "icons"

SOURCES = {
    "reinicio.png": "c__Users_giubr_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-1d4ba184-a08b-410e-a986-dd2e02294a38.png",
    "creditos.png": "c__Users_giubr_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-3565d2e3-a153-4b4a-aee6-a9c70f3ebb84.png",
    "alma.png": "c__Users_giubr_AppData_Roaming_Cursor_User_workspaceStorage_empty-window_images_image-fd0d6600-7898-4f6b-9e35-e82fbb6dacfd.png",
}

FLOOD_TOLERANCE = {
    "reinicio.png": 22,
    "creditos.png": 22,
    "alma.png": 26,
}

MIN_COMPONENT_AREA = 40


def sample_background_color(rgb: np.ndarray) -> np.ndarray:
    h, w, _ = rgb.shape
    border = np.concatenate(
        [
            rgb[0, :, :],
            rgb[h - 1, :, :],
            rgb[:, 0, :],
            rgb[:, w - 1, :],
        ],
        axis=0,
    )
    return np.median(border, axis=0)


def flood_background_mask(rgb: np.ndarray, bg: np.ndarray, tolerance: float) -> np.ndarray:
    h, w, _ = rgb.shape
    dist = np.linalg.norm(rgb - bg, axis=2)
    is_bg = dist < tolerance
    visited = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            if is_bg[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if is_bg[y, x] and not visited[y, x]:
                visited[y, x] = True
                q.append((y, x))

    while q:
        y, x = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and is_bg[ny, nx] and not visited[ny, nx]:
                visited[ny, nx] = True
                q.append((ny, nx))

    return visited


def fill_enclosed_holes(
    foreground: np.ndarray, rgb: np.ndarray, bg: np.ndarray, min_hole_dist: float = 38.0
) -> np.ndarray:
    """Fill dark enclosed areas only (coin); skip light pockets inside star edges."""
    h, w = foreground.shape
    inv = ~foreground
    reachable = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        for y in (0, h - 1):
            if inv[y, x] and not reachable[y, x]:
                reachable[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if inv[y, x] and not reachable[y, x]:
                reachable[y, x] = True
                q.append((y, x))

    while q:
        y, x = q.popleft()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and inv[ny, nx] and not reachable[ny, nx]:
                reachable[ny, nx] = True
                q.append((ny, nx))

    holes = inv & ~reachable
    dist = np.linalg.norm(rgb - bg, axis=2)
    return foreground | (holes & (dist >= min_hole_dist))


def scrub_reinicio_smear(rgb: np.ndarray, alpha: np.ndarray, bg: np.ndarray) -> np.ndarray:
    """Remove near-white JPEG residue still attached to the star."""
    dist = np.linalg.norm(rgb - bg, axis=2)
    sat = np.max(rgb, axis=2) - np.min(rgb, axis=2)
    bright = np.min(rgb, axis=2) > 185
    smear = (alpha > 0) & ((dist < 38.0) | (bright & (sat < 58.0)))
    alpha = alpha.copy()
    alpha[smear] = 0.0
    return keep_largest_component(alpha)


def keep_largest_component(alpha: np.ndarray, min_area: int = MIN_COMPONENT_AREA) -> np.ndarray:
    """Drop detached marks (white smears, gray bars, corner scraps)."""
    mask = alpha >= 128
    h, w = mask.shape
    visited = np.zeros((h, w), dtype=bool)
    best: list[tuple[int, int]] = []
    best_len = 0
    neighbors = ((-1, 0), (1, 0), (0, -1), (0, 1))

    for y in range(h):
        for x in range(w):
            if not mask[y, x] or visited[y, x]:
                continue
            q: deque[tuple[int, int]] = deque([(y, x)])
            visited[y, x] = True
            coords: list[tuple[int, int]] = []
            while q:
                cy, cx = q.popleft()
                coords.append((cy, cx))
                for dy, dx in neighbors:
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        q.append((ny, nx))
            if len(coords) > best_len:
                best_len = len(coords)
                best = coords

    out = np.zeros_like(alpha)
    if best_len >= min_area:
        for cy, cx in best:
            out[cy, cx] = alpha[cy, cx]
    return out


def crop_colorful_foreground(rgb: np.ndarray, bg: np.ndarray, pad: int = 1) -> np.ndarray:
    dist = np.linalg.norm(rgb - bg, axis=2)
    sat = np.max(rgb, axis=2) - np.min(rgb, axis=2)
    fg = (dist > 46.0) | (sat > 34.0)
    if not np.any(fg):
        return rgb
    ys, xs = np.where(fg)
    y0 = max(0, int(ys.min()) - pad)
    y1 = min(rgb.shape[0], int(ys.max()) + pad + 1)
    x0 = max(0, int(xs.min()) - pad)
    x1 = min(rgb.shape[1], int(xs.max()) + pad + 1)
    return rgb[y0:y1, x0:x1, :]


def trim_screenshot_chrome(rgb: np.ndarray, bg: np.ndarray, bar_tolerance: float = 18.0) -> np.ndarray:
    h, w, _ = rgb.shape

    def column_is_bar(x: int) -> bool:
        col = rgb[:, x, :]
        dist = np.linalg.norm(col - bg, axis=1)
        return float(np.mean(dist < bar_tolerance)) >= 0.9

    def row_is_bar(y: int) -> bool:
        row = rgb[y, :, :]
        dist = np.linalg.norm(row - bg, axis=1)
        return float(np.mean(dist < bar_tolerance)) >= 0.9

    x0, x1 = 0, w
    while x1 > x0 + 4 and column_is_bar(x1 - 1):
        x1 -= 1
    while x0 < x1 - 4 and column_is_bar(x0):
        x0 += 1

    y0, y1 = 0, h
    while y1 > y0 + 4 and row_is_bar(y1 - 1):
        y1 -= 1
    while y0 < y1 - 4 and row_is_bar(y0):
        y0 += 1

    return rgb[y0:y1, x0:x1, :]


def remove_background(img: Image.Image, name: str) -> Image.Image:
    rgba = img.convert("RGBA")
    data = np.array(rgba, dtype=np.float32)
    rgb = data[:, :, :3].copy()
    bg = sample_background_color(rgb)

    if name == "alma.png":
        rgb = crop_colorful_foreground(rgb, bg)
        rgb = trim_screenshot_chrome(rgb, bg)
    elif name == "reinicio.png":
        rgb = crop_colorful_foreground(rgb, bg, pad=2)

    tol = FLOOD_TOLERANCE[name]
    bg_mask = flood_background_mask(rgb, bg, tol)
    fg = ~bg_mask
    if name == "creditos.png":
        fg = fill_enclosed_holes(fg, rgb, bg)

    alpha = np.where(fg, 255.0, 0.0)

    if name == "reinicio.png":
        alpha = scrub_reinicio_smear(rgb, alpha, bg)
    else:
        alpha = keep_largest_component(alpha)

    out = np.zeros((rgb.shape[0], rgb.shape[1], 4), dtype=np.uint8)
    out[:, :, :3] = np.clip(rgb, 0, 255).astype(np.uint8)
    out[:, :, 3] = np.clip(alpha, 0, 255).astype(np.uint8)

    result = Image.fromarray(out, mode="RGBA")
    bbox = result.getbbox()
    if not bbox:
        return result

    pad = 2 if name in ("reinicio.png", "creditos.png") else 1
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - pad)
    y0 = max(0, y0 - pad)
    x1 = min(result.width, x1 + pad)
    y1 = min(result.height, y1 + pad)
    return result.crop((x0, y0, x1, y1))


def pad_square(icon: Image.Image) -> Image.Image:
    w, h = icon.size
    side = max(w, h)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(icon, ((side - w) // 2, (side - h) // 2), icon)
    return canvas


def upscale_for_ui(icon: Image.Image, min_size: int = 128) -> Image.Image:
    w, h = icon.size
    scale = max(1, int(np.ceil(min_size / min(w, h))))
    if scale <= 1:
        return icon
    return icon.resize((w * scale, h * scale), Image.Resampling.NEAREST)


def count_components(alpha: np.ndarray) -> int:
    mask = alpha >= 128
    h, w = mask.shape
    visited = np.zeros((h, w), dtype=bool)
    n = 0
    for y in range(h):
        for x in range(w):
            if not mask[y, x] or visited[y, x]:
                continue
            n += 1
            q: deque[tuple[int, int]] = deque([(y, x)])
            visited[y, x] = True
            while q:
                cy, cx = q.popleft()
                for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not visited[ny, nx]:
                        visited[ny, nx] = True
                        q.append((ny, nx))
    return n


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for icon_name, asset_name in SOURCES.items():
        src = ASSETS / asset_name
        if not src.exists():
            raise FileNotFoundError(src)
        raw = Image.open(src)
        clean = remove_background(raw, icon_name)
        if icon_name == "creditos.png":
            clean = pad_square(clean)
        clean = upscale_for_ui(clean, min_size=128)
        out = OUT_DIR / icon_name
        clean.save(out, format="PNG")
        arr = np.array(clean)
        comps = count_components(arr[:, :, 3])
        margin = int(np.sum(arr[:6, :, 3] > 0)) + int(np.sum(arr[:, -6:, 3] > 0))
        print(f"{icon_name}: {raw.size} -> {clean.size} comps={comps} margin_px={margin}")


if __name__ == "__main__":
    main()
