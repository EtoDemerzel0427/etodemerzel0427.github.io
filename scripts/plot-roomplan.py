#!/usr/bin/env python3
"""
把 RoomPlan 的 OBJ 画成一张俯视平面图，用来核对朝向和布局。

read-roomplan.py 给的是数字，这个给的是图 —— 照着实拍照片对一眼，
就知道哪面墙是窗、沙发朝哪边、家具有没有认错类别。

    python3 scripts/plot-roomplan.py ~/Downloads/scan/scan.obj out.png
    python3 scripts/plot-roomplan.py scan.obj out.png --xlim 0 5.4 --zlim -4.4 1

坐标约定：RoomPlan 是 Y 轴朝上、单位米。图上横轴 X、纵轴 Z（向下为 +Z）。
"""
import sys
from collections import OrderedDict

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle

# 类别 -> 颜色，认不出的走灰色
COLORS = {
    'Wall': '#333333', 'Door': '#c1440e', 'Window': '#1e88e5',
    'sofa': '#6a4c93', 'bed': '#8e6c88', 'television': '#111111',
    'table': '#1b998b', 'chair': '#e07a5f', 'storage': '#b08968',
    'refrigerator': '#4a6fa5', 'oven': '#7a7a7a', 'stove': '#7a7a7a',
    'dishwasher': '#7a7a7a', 'sink': '#5aa9c9', 'toilet': '#9ab', 'bathtub': '#9ab',
}


def read_obj(path):
    verts, objs, cur = [], OrderedDict(), None
    with open(path) as f:
        for line in f:
            if line.startswith('v '):
                x, y, z = line.split()[1:4]
                verts.append((float(x), float(y), float(z)))
            elif line[:2] in ('o ', 'g '):
                cur = line[2:].strip()
                objs.setdefault(cur, set())
            elif line.startswith('f ') and cur is not None:
                for tok in line.split()[1:]:
                    i = int(tok.split('/')[0])
                    objs[cur].add(i - 1 if i > 0 else len(verts) + i)
    return verts, objs


def color_for(name):
    for key, c in COLORS.items():
        if name.lower().startswith(key.lower()):
            return c
    return '#999999'


def opt(flag, n, default=None):
    if flag not in sys.argv:
        return default
    i = sys.argv.index(flag)
    return [float(v) for v in sys.argv[i + 1:i + 1 + n]]


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) < 2:
        print(__doc__)
        return 1
    obj_path, out_path = args[0], args[1]
    xlim, zlim = opt('--xlim', 2), opt('--zlim', 2)

    verts, objs = read_obj(obj_path)
    fig, ax = plt.subplots(figsize=(14, 14))

    for name, idx in objs.items():
        if name.startswith(('Joint_', 'Ceiling_', 'Floor_')):
            continue
        pts = [verts[i] for i in idx if i < len(verts)]
        if not pts:
            continue
        xs, ys, zs = zip(*pts)
        x0, x1, z0, z1 = min(xs), max(xs), min(zs), max(zs)
        cx, cz = (x0 + x1) / 2, (z0 + z1) / 2
        if xlim and not (xlim[0] - 0.5 <= cx <= xlim[1] + 0.5):
            continue
        if zlim and not (zlim[0] - 0.5 <= cz <= zlim[1] + 0.5):
            continue

        c = color_for(name)
        is_shell = name.startswith(('Wall', 'Door', 'Window'))
        ax.add_patch(Rectangle(
            (x0, z0), max(x1 - x0, 0.03), max(z1 - z0, 0.03),
            facecolor=c, alpha=0.35 if is_shell else 0.55,
            edgecolor=c, linewidth=1.6 if is_shell else 1.0,
        ))
        # 墙体只标编号，家具标全名 + 离地高度
        label = name if is_shell else f'{name}\n{min(ys):.2f}~{max(ys):.2f}'
        ax.text(cx, cz, label, ha='center', va='center',
                fontsize=5.5 if is_shell else 6.5,
                color='#000', zorder=5)

    if xlim:
        ax.set_xlim(*xlim)
    if zlim:
        ax.set_ylim(*zlim)
    ax.invert_yaxis()          # +Z 向下，和从上往下看的直觉一致
    ax.set_aspect('equal')
    ax.grid(True, linewidth=0.3, alpha=0.4)
    ax.set_xlabel('X (m)')
    ax.set_ylabel('Z (m)')
    ax.set_title(obj_path.split('/')[-1] + ' — 俯视平面')
    fig.savefig(out_path, dpi=110, bbox_inches='tight')
    print('wrote', out_path)
    return 0


if __name__ == '__main__':
    sys.exit(main())
