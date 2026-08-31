/* ============================================================================
   右桌那台机器上跑的贪吃蛇。

   和左桌那块屏是**两套完全不同的技术**，各得其所：
     · 左桌要显示真网页 → 只能是真 DOM（iframe），见 webscreen.js
     · 右桌是游戏      → 画在 CanvasTexture 上，贴在屏面上

   走贴图的好处是它就是块普通几何体：任何角度都看得见，被椅背挡住就是挡住，
   不存在左桌那套分层带来的一堆麻烦。代价是只能显示我们自己画得出来的东西
   —— 而一局贪吃蛇正好完全画得出来。

   游戏时钟不跟 rAF 走：帧率在 45–120Hz 之间飘，蛇的步速会跟着飘。
   用累加器按固定步长走（STEP 秒一格），掉帧只是补步，速度是稳的。
   ========================================================================== */

import * as THREE from 'three';

const COLS = 32, ROWS = 19, CELL = 20;      // 画布 640×380，和那块屏 1.68 的长宽比对得上
const W = COLS * CELL, H = ROWS * CELL;
const STEP = 0.115;                          // 每格多少秒
const GROW = 3;                              // 吃一颗长几节

const C = {
    bg: '#0d1220',
    grid: 'rgba(120,160,220,0.07)',
    snake: '#5ee6a8',
    head: '#b6ffe0',
    food: '#ff5470',
    text: '#cfe3ff',
    dim: 'rgba(207,227,255,0.45)',
};

/**
 * @param screen living.js userData.screens 里的那一项 { mesh, w, h }
 */
export function createSnake(screen) {
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;

    const face = new THREE.Mesh(
        new THREE.PlaneGeometry(screen.w, screen.h),
        new THREE.MeshStandardMaterial({
            map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0,
            roughness: 0.34, metalness: 0,
        }),
    );
    /* 平面默认朝 +Z，这块屏朝 -X，所以绕 Y 转 -90°。转完平面自身的 +X
       落在世界 +Z 上 —— 和人坐在 -X 那头时的右手边一致，画面不会左右翻。 */
    face.rotation.y = -Math.PI / 2;
    face.position.x = -0.0028;
    face.visible = false;
    face.userData.ghost = true;          // 命中还归后面那块 Box
    face.userData.isOutline = true;
    screen.mesh.add(face);

    /* ---------- 局面 ---------- */
    let state = 'idle';                  // idle | play | dead
    let snake, dir, next, food, grow, score, best = 0, acc = 0, blink = 0;

    const reset = () => {
        snake = [{ x: 8, y: 9 }, { x: 7, y: 9 }, { x: 6, y: 9 }];
        dir = { x: 1, y: 0 }; next = dir;
        grow = 0; score = 0; acc = 0;
        placeFood();
    };

    function placeFood() {
        /* 不能随便撒：撒到蛇身上那颗果子就永远吃不着。从所有空格里挑，
           格子只有 608 个，全枚举比「撞了重试」稳。 */
        const free = [];
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
            if (!snake.some((s) => s.x === x && s.y === y)) free.push({ x, y });
        }
        food = free.length ? free[(Math.random() * free.length) | 0] : null;
    }

    function step() {
        dir = next;
        /* 四边是**通的**：从上面出去从下面回来。诺基亚那版就是这样，
           撞墙即死是后来的变体 —— 这屋里要的是小时候玩的那个。
           取模前先加一个周期，负数取模在 JS 里还是负的。 */
        const head = {
            x: (snake[0].x + dir.x + COLS) % COLS,
            y: (snake[0].y + dir.y + ROWS) % ROWS,
        };
        // 只有咬到自己才算完。尾巴那一节这一步会让开，所以不算撞
        const hitSelf = snake.some((s, i) => i < snake.length - 1 && s.x === head.x && s.y === head.y);
        if (hitSelf) {
            state = 'dead';
            best = Math.max(best, score);
            return;
        }
        snake.unshift(head);
        if (food && head.x === food.x && head.y === food.y) {
            score += 1; grow += GROW; placeFood();
        }
        if (grow > 0) grow -= 1; else snake.pop();
    }

    /* ---------- 画 ---------- */
    const cell = (x, y, color, inset = 2, r = 5) => {
        g.fillStyle = color;
        g.beginPath();
        g.roundRect(x * CELL + inset, y * CELL + inset, CELL - inset * 2, CELL - inset * 2, r);
        g.fill();
    };

    function draw() {
        g.fillStyle = C.bg;
        g.fillRect(0, 0, W, H);
        g.fillStyle = C.grid;
        for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
            g.fillRect(x * CELL + CELL / 2 - 1, y * CELL + CELL / 2 - 1, 2, 2);
        }

        if (food) cell(food.x, food.y, C.food, 4, 6);
        for (let i = snake.length - 1; i >= 0; i--) {
            cell(snake[i].x, snake[i].y, i === 0 ? C.head : C.snake, i === 0 ? 1 : 2);
        }

        g.font = '600 20px ui-monospace, SFMono-Regular, Menlo, monospace';
        g.textBaseline = 'top';
        g.fillStyle = C.text;
        g.fillText(String(score).padStart(3, '0'), 14, 12);
        g.fillStyle = C.dim;
        g.textAlign = 'right';
        g.fillText(`BEST ${String(best).padStart(3, '0')}`, W - 14, 12);
        g.textAlign = 'left';

        if (state !== 'play') {
            g.fillStyle = 'rgba(13,18,32,0.82)';
            g.fillRect(0, 0, W, H);
            g.textAlign = 'center';
            g.fillStyle = C.text;
            g.font = '700 46px ui-monospace, SFMono-Regular, Menlo, monospace';
            g.fillText(state === 'dead' ? 'GAME OVER' : 'SNAKE', W / 2, H / 2 - 58);
            g.font = '500 20px ui-monospace, SFMono-Regular, Menlo, monospace';
            if (state === 'dead') {
                g.fillStyle = C.food;
                g.fillText(`${score} 分`, W / 2, H / 2 + 4);
            }
            // 提示闪一下，暗示「在等你按键」
            g.fillStyle = blink % 1 < 0.62 ? C.dim : 'rgba(207,227,255,0.14)';
            g.font = '500 18px ui-monospace, SFMono-Regular, Menlo, monospace';
            g.fillText('方向键 / WASD 开始', W / 2, H / 2 + 44);
            g.textAlign = 'left';
        }
        tex.needsUpdate = true;
    }

    reset();
    draw();

    const DIRS = {
        arrowup: { x: 0, y: -1 }, w: { x: 0, y: -1 },
        arrowdown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
        arrowleft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
        arrowright: { x: 1, y: 0 }, d: { x: 1, y: 0 },
    };

    return {
        get on() { return face.visible; },
        setPower(on) {
            face.visible = on;
            face.material.emissiveIntensity = on ? 0.95 : 0;
            if (!on && state === 'play') { state = 'idle'; reset(); draw(); }
        },

        /** @returns {boolean} 这个键被游戏吃掉了没有（吃掉了就别再拿去走位） */
        key(k) {
            const d = DIRS[k];
            if (!d) return false;
            if (state !== 'play') { reset(); state = 'play'; next = d; return true; }
            /* 不许 180° 掉头：那一步会直接撞进第二节，读起来像「按了个键就死了」。
               比的是 dir 而不是 next —— 同一步里连按上、左会先把 next 改成上，
               再拿左去比上是合法的，可蛇这一步实际还朝着右。 */
            if (d.x === -dir.x && d.y === -dir.y) return true;
            next = d;
            return true;
        },

        update(dt) {
            if (!face.visible) return;
            if (state === 'play') {
                acc += dt;
                let n = 0;
                // 卡了一下之后别把攒下的步数一次性走完，那是「瞬移一截」
                while (acc >= STEP && n < 3) { acc -= STEP; step(); n += 1; if (state !== 'play') break; }
                if (n) draw();
            } else {
                const b0 = blink;
                blink += dt;
                if ((b0 % 1 < 0.62) !== (blink % 1 < 0.62)) draw();
            }
        },

        dispose() {
            screen.mesh.remove(face);
            face.geometry.dispose(); face.material.dispose(); tex.dispose();
        },
    };
}
