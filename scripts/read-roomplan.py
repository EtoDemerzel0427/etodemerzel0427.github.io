#!/usr/bin/env python3
"""
读 RoomPlan 导出的 OBJ，打印每个物件的真实尺寸和位置。

RoomPlan 的导出是语义化的：物件名就是类别（refrigerator_0、oven_0、
storage_cabinet_mid1_3、Door_3、Wall_42……），所以不需要渲染，
直接按名字取包围盒就能得到一张可以照着建模的尺寸表。

    python3 scripts/read-roomplan.py ~/Downloads/scan/scan.obj
    python3 scripts/read-roomplan.py ~/Downloads/scan/scan.obj --filter refrigerator oven cabinet

坐标约定：RoomPlan 是 Y 轴朝上、单位米。哪个水平轴是「宽」取决于
物件贴的是哪面墙，看输出里 X/Z 哪个跨度更大。
"""
import sys
from collections import OrderedDict


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


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if not args:
        print(__doc__)
        return 1
    keys = []
    if '--filter' in sys.argv:
        keys = sys.argv[sys.argv.index('--filter') + 1:]

    verts, objs = read_obj(args[0])
    print(f'{len(verts)} 顶点 / {len(objs)} 物件\n')
    print(f'{"物件":30s} {"X 跨":>6s} {"Y 跨":>6s} {"Z 跨":>6s}   {"中心":>22s}   Y 范围')
    print('-' * 96)
    for name, idx in objs.items():
        if keys and not any(k.lower() in name.lower() for k in keys):
            continue
        pts = [verts[i] for i in idx if i < len(verts)]
        if not pts:
            continue
        xs, ys, zs = zip(*pts)
        dx, dy, dz = max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)
        cxx, cyy, czz = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, (max(zs) + min(zs)) / 2
        print(f'{name:30s} {dx:6.2f} {dy:6.2f} {dz:6.2f}   '
              f'({cxx:6.2f},{cyy:6.2f},{czz:6.2f})   {min(ys):5.2f}~{max(ys):5.2f}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
