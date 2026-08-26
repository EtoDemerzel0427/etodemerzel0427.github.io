import * as THREE from 'three';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

/**
 * 漫画合成：色阶量化 + 本戴网点 + 色差 + 颗粒 + 暗角。
 * 先按 PBR 正常渲染，再在这里把它「印」成漫画——
 * 和先把画面画平相比，形体的立体感是保住的。
 */
export const ComicShader = {
    uniforms: {
        tDiffuse: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uDotSize: { value: 4.4 },      // 网点周期，CSS 像素
        uContrast: { value: 1.38 },
        /* 抖动幅度 = uDither / uPosterize 个色阶。墙面这种极缓的渐变，
           一整面墙才跨一级，0.22 级的抖动根本盖不住那条台阶线 ——
           画面上就是一条横贯整面墙的硬边。给到 0.55 才打得散。 */
        uDither: { value: 0.55 },
        uKnee: { value: 0.60 },
        uShoulder: { value: 0.30 },
        uDotStrength: { value: 0.62 },
        uPosterize: { value: 9.0 },    // 每通道色阶数，越小越硬
        uCA: { value: 0.0011 },
        uGrain: { value: 0.028 },
        uVignette: { value: 0.85 },
        uSaturation: { value: 1.16 },
    },

    vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,

    fragmentShader: /* glsl */`
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform vec2 uResolution;
        uniform float uTime;
        uniform float uDotSize;
        uniform float uContrast;
        uniform float uDither;
        uniform float uKnee;
        uniform float uShoulder;
        uniform float uDotStrength;
        uniform float uPosterize;
        uniform float uCA;
        uniform float uGrain;
        uniform float uVignette;
        uniform float uSaturation;

        float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

        vec2 rot(vec2 p, float a) {
            float s = sin(a), c = cos(a);
            return mat2(c, -s, s, c) * p;
        }

        // 本戴网点：越暗点越大。sin*sin 取阈值只会得到棋盘格，必须按半径算。
        float halftone(vec2 frag, float angle, float period, float lum) {
            vec2 cell = fract(rot(frag, angle) / period) - 0.5;
            float r = sqrt(clamp(1.0 - lum, 0.0, 1.0)) * 0.56;
            return 1.0 - smoothstep(r - 0.14, r + 0.03, length(cell));
        }

        void main() {
            vec2 uv = vUv;
            vec2 frag = uv * uResolution;
            vec2 dir = uv - 0.5;
            float r2 = dot(dir, dir);

            // 径向色差，越靠边越明显
            float ca = uCA * (0.3 + r2 * 2.6);
            vec3 col;
            col.r = texture2D(tDiffuse, uv + dir * ca).r;
            col.g = texture2D(tDiffuse, uv).g;
            col.b = texture2D(tDiffuse, uv - dir * ca).b;

            // 拉对比 + 提饱和：漫画不要灰，也不要糊成一片白
            col = clamp((col - 0.46) * uContrast + 0.44, 0.0, 1.0);
            float l0 = luma(col);
            col = clamp(mix(vec3(l0), col, uSaturation), 0.0, 1.0);

            // 高光软压缩。必须在量化之前做：否则一大片反光会被直接切成纯白，
            // 高光里的形体全部丢失，看起来就是「过曝的反光」。
            vec3 over = max(col - uKnee, vec3(0.0));
            col = min(col, vec3(uKnee)) + over * uShoulder;

            // 量化前加一点抖动。平滑渐变落在两级之间时会产生硬邦邦的色带
            // （不锈钢面、墙面、柜门上那些莫名其妙的条纹都是这么来的），
            // 抖动把台阶打散成点状过渡，正好和网点风格相容。
            float dth = fract(sin(dot(frag, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
            col += dth * uDither / uPosterize;

            // 色阶量化。必须在亮度空间做，不能按 R/G/B 三通道各自量化——
            // 平滑渐变上三个通道的台阶会错开，于是不锈钢那种大面积渐变
            // 就会长出粉、绿、青的彩色条带。按亮度量化则只切明暗、保住色相。
            float l0q = luma(col);
            float lq = floor(l0q * uPosterize + 0.5) / uPosterize;
            col = clamp(col * (l0q > 0.001 ? lq / l0q : 1.0), 0.0, 1.0);

            float l = luma(col);

            // 暗部铺网点
            float shadowMask = smoothstep(0.38, 0.04, l);
            float dotIn = halftone(frag, 0.45, uDotSize * 2.2, smoothstep(0.0, 0.72, l));
            col = mix(col, col * 0.62, dotIn * shadowMask * uDotStrength);

            // 亮部一层更细的冷色网点，做印刷的脏
            float hiMask = smoothstep(0.90, 1.0, l);
            float dotHi = halftone(frag, -0.95, uDotSize * 1.35, 0.62);
            col += vec3(0.02, 0.07, 0.11) * dotHi * hiMask * uDotStrength * 0.45;

            // 颗粒
            float n = fract(sin(dot(frag + uTime * 41.0, vec2(12.9898, 78.233))) * 43758.5453);
            col += (n - 0.5) * uGrain;

            // 暗角
            col *= mix(1.0, smoothstep(1.02, 0.28, length(dir) * 1.25), uVignette);

            gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
        }
    `,
};

export function makeComicPass(width, height, dpr) {
    const pass = new ShaderPass(ComicShader);
    pass.uniforms.uResolution.value.set(width / dpr, height / dpr);
    return pass;
}
