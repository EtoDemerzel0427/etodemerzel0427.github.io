#!/usr/bin/env python3
"""
生成厨房柜门的 fineline 三聚氰胺贴面贴图。

为什么不用扫描素材：实物是极细、极密的平行竖线（一块 40cm 门板上几百条），
Poly Haven 的橡木单板扫描件纹路都比它粗一个量级，而且带波浪状花纹，性质不对。
这种规则图案程序化生成更准，文件也更小。

噪声全部在频域生成 —— FFT 的结果天然是周期的，所以平铺无缝，
不需要额外做接缝处理。

    python3 scripts/make-cabinet-texture.py
"""
import numpy as np
from PIL import Image
import pathlib

N = 1024
OUT = pathlib.Path(__file__).resolve().parent.parent / 'public/travel/textures/wood_diff.webp'

# 实物量出来的浅暖灰褐
BASE = np.array([208.0, 201.0, 189.0])   # 偏亮一点，因为纹理只会把它压暗

rng = np.random.default_rng(20260825)


def band1d(center, width, n=N):
    """一维带通噪声。center/width 的单位是「每图宽多少个周期」。"""
    f = np.fft.rfft(rng.normal(0, 1, n))
    freq = np.arange(f.size)
    f *= np.exp(-(((freq - center) / width) ** 2))
    out = np.fft.irfft(f, n)
    return out / (np.abs(out).max() + 1e-9)


def lowpass2d(fy_scale, fx_scale, n=N):
    """二维低通噪声，用来让线条沿长度方向有强弱变化，不至于像印刷条纹。"""
    F = np.fft.fft2(rng.normal(0, 1, (n, n)))
    fy = np.fft.fftfreq(n)[:, None] * n
    fx = np.fft.fftfreq(n)[None, :] * n
    F *= np.exp(-((fy / fy_scale) ** 2 + (fx / fx_scale) ** 2))
    out = np.real(np.fft.ifft2(F))
    return out / (np.abs(out).max() + 1e-9)


# 只做细线，不加宽缓的明暗带。
#
# 这一点很反直觉但很关键：宽带在远处不会被 mipmap 平均掉，
# 而后期的色阶量化（9 级）会把它切成硬边，于是柜门上出现一道道竖白条，
# 看起来像刷子刷的。细线则会被正常平均成一片均匀色 —— 这恰好和实物一致：
# 远看几乎是纯色，凑近才看得见纹路。
fine = band1d(320, 160)[None, :]   # 每图宽约 320 条 → 1m 上 320 条
mid  = band1d(110, 60)[None, :]

# 沿 y 的缓变，让每条线有断续和深浅（只调制细线，不产生新的低频结构）
modulation = lowpass2d(fy_scale=9.0, fx_scale=120.0)

# 纹理只做「变暗」不做「变亮」。真实木纹就是浅底上的深色线，
# 而且色阶量化只会把它往下推一档，不会冒出亮白色的竖条。
def only_dark(x):
    return (x - x.max()) / (x.max() - x.min() + 1e-9)   # → [-1, 0]

val = (1.0
       + 0.090 * only_dark(fine) * (0.55 + 0.55 * modulation)
       + 0.032 * only_dark(mid)  * (0.60 + 0.45 * modulation))

img = np.clip(val[..., None] * BASE, 0, 255).astype(np.uint8)
Image.fromarray(img).save(OUT, 'WEBP', quality=90, method=6)

mean = img.reshape(-1, 3).mean(0).astype(int)
lo, hi = np.percentile(img.mean(2), [2, 98])
print(f'{OUT.name}  {OUT.stat().st_size // 1024} KB')
print(f'平均色 #{mean[0]:02x}{mean[1]:02x}{mean[2]:02x}   明暗范围 {lo:.0f}–{hi:.0f}（±{(hi-lo)/2/mean.mean()*100:.1f}%）')
