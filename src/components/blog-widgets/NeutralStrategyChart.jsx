import React, { useState, useMemo, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import annotationPlugin from 'chartjs-plugin-annotation';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
    annotationPlugin
);

const STRATEGY_CONFIG = {
    'iron-condor': {
        title: "铁鹰式 (Iron Condor)",
        desc: "卖出虚值宽跨式 (Short Strangle) + 买入两翼保护",
        type: 'iron-condor',
        default: { k1: 80, k2: 90, k3: 110, k4: 120, creditPut: 2, creditCall: 2 }
    },
    'long-call-butterfly': {
        title: "多头看涨蝶式 (Long Call Butterfly)",
        desc: "买入低价/高价 Call + 卖出 2 份中间价 Call",
        type: 'butterfly-call',
        default: { km: 100, width: 10, debit: 2 }
    },
    'long-put-butterfly': {
        title: "多头看跌蝶式 (Long Put Butterfly)",
        desc: "买入低价/高价 Put + 卖出 2 份中间价 Put",
        type: 'butterfly-put',
        default: { km: 100, width: 10, debit: 2 }
    }
};

const NeutralStrategyChart = ({ strategy = 'iron-condor' }) => {
    const config = STRATEGY_CONFIG[strategy];
    const type = config.type;
    const isCondor = type === 'iron-condor';
    const isButterfly = type.includes('butterfly');

    // State initialization
    // Iron Condor: K1, K2, K3, K4, CreditPut, CreditCall
    const [k1, setK1] = useState(config.default.k1 || 80);
    const [k2, setK2] = useState(config.default.k2 || 90);
    const [k3, setK3] = useState(config.default.k3 || 110);
    const [k4, setK4] = useState(config.default.k4 || 120);
    const [creditPut, setCreditPut] = useState(config.default.creditPut || 2);
    const [creditCall, setCreditCall] = useState(config.default.creditCall || 2);

    // Butterfly: KM, Width, Debit
    const [km, setKm] = useState(config.default.km || 100);
    const [width, setWidth] = useState(config.default.width || 10);
    const [debit, setDebit] = useState(config.default.debit || 2);

    // --- Constraints Logic ---
    useEffect(() => {
        if (isCondor) {
            // K1 < K2 < K3 < K4
            // Simplified Chain Reaction
            if (k2 <= k1) setK2(k1 + 5);
            if (k3 <= k2) setK3(k2 + 5);
            if (k4 <= k3) setK4(k3 + 5);
        }
    }, [k1, k2, k3, k4, isCondor]);


    // --- Calculation Logic ---
    const { labels, dataCombo, dataLegLeft, dataLegRight, stats, chartMin, chartMax } = useMemo(() => {
        const center = isCondor ? (k2 + k3) / 2 : km;
        const rangeWidth = isCondor ? (k4 - k1) : (width * 3);
        const rangeMin = center - rangeWidth * 0.8;
        const rangeMax = center + rangeWidth * 0.8;
        const steps = 200;

        const labels = [];
        const dataCombo = [];
        const dataLegLeft = [];
        const dataLegRight = [];

        // Derived Butterfly Strikes
        const kl = km - width;
        const kh = km + width;

        for (let i = 0; i <= steps; i++) {
            const s = rangeMin + (rangeMax - rangeMin) * (i / steps);
            labels.push(s.toFixed(1));

            let val = 0;
            let legL = 0;
            let legR = 0;

            if (isCondor) {
                // Iron Condor Payoff
                // Leg Left: Bull Put Spread (Short K2, Long K1)
                // Value = Credit - Max(K2 - S, 0) + Max(K1 - S, 0)
                legL = creditPut - Math.max(k2 - s, 0) + Math.max(k1 - s, 0);

                // Leg Right: Bear Call Spread (Short K3, Long K4)
                // Value = Credit - Max(S - K3, 0) + Max(S - K4, 0)
                legR = creditCall - Math.max(s - k3, 0) + Math.max(s - k4, 0);

                // Total
                val = legL + legR;

            } else if (type === 'butterfly-call') {
                // Long Call Butterfly
                // Leg 1 (Bull Call Spread): Buy KL, Sell KM. Debit = debit/2 (approx)
                // Payoff = Max(S - KL, 0) - Max(S - KM, 0) - debit/2
                legL = Math.max(s - kl, 0) - Math.max(s - km, 0) - debit / 2;

                // Leg 2 (Bear Call Spread): Sell KM, Buy KH. Debit = debit/2
                // Payoff = -Max(S - KM, 0) + Max(S - KH, 0) - debit / 2;
                legR = -Math.max(s - km, 0) + Math.max(s - kh, 0) - debit / 2;

                val = legL + legR;

            } else if (type === 'butterfly-put') {
                // Long Put Butterfly: Buy KL, Sell 2 KM, Buy KH

                // Leg L (Bull Put Spread): Short KM, Long KL.
                legL = Math.max(kl - s, 0) - Math.max(km - s, 0) - debit / 2;

                // Leg R (Bear Put Spread): Long KH, Short KM.
                legR = Math.max(kh - s, 0) - Math.max(km - s, 0) - debit / 2;

                val = legL + legR;
            }

            dataCombo.push(val);
            dataLegLeft.push(legL);
            dataLegRight.push(legR);
        }

        // Stats
        let stats = {};
        if (isCondor) {
            const totalCredit = creditPut + creditCall;
            const widthPut = k2 - k1;
            const widthCall = k4 - k3;
            // Max Risk is usually the wider of the two wings minus credit
            // Assuming simplified model where risk is processed on either side (stock can't be both high and low)
            const maxLossPut = widthPut - totalCredit;
            const maxLossCall = widthCall - totalCredit;
            const maxLoss = Math.max(maxLossPut, maxLossCall); // Worst case

            stats = {
                entry: `Net Credit $${totalCredit.toFixed(2)}`,
                maxProfit: `$${totalCredit.toFixed(2)}`,
                maxLoss: `$${maxLoss.toFixed(2)}`,
                breakeven: `$${(k2 - totalCredit).toFixed(2)} / $${(k3 + totalCredit).toFixed(2)}`
            };
        } else {
            // Butterfly
            const maxProfit = width - debit; // At KM
            const maxLoss = debit; // At wings
            const beLow = kl + debit;
            const beHigh = kh - debit;

            stats = {
                entry: `Net Debit $${debit.toFixed(2)}`,
                maxProfit: `$${maxProfit.toFixed(2)}`,
                maxLoss: `$${maxLoss.toFixed(2)}`,
                breakeven: `$${beLow.toFixed(2)} / $${beHigh.toFixed(2)}`
            };
        }

        return { labels, dataCombo, dataLegLeft, dataLegRight, stats, chartMin: rangeMin, chartMax: rangeMax, kl, kh };
    }, [isCondor, type, k1, k2, k3, k4, creditPut, creditCall, km, width, debit]);


    // --- Chart Options ---
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        scales: {
            x: { title: { display: true, text: 'Stock Price' }, grid: { display: false } },
            y: { title: { display: true, text: 'P&L ($)' }, grid: { color: '#f3f4f6' } }
        },
        plugins: {
            legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 8 } },
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label || 'P&L'}: $${ctx.parsed.y.toFixed(2)}` } },
            annotation: {
                annotations: {
                    // Lines for critical strikes
                    ...(isCondor ? {
                        lineK2: { type: 'line', xMin: labels.findIndex(l => parseFloat(l) >= k2), xMax: labels.findIndex(l => parseFloat(l) >= k2), borderColor: 'rgba(239, 68, 68, 0.3)', borderWidth: 1, borderDash: [4, 4], label: { display: true, content: `Put Sold K1 ${k2}`, position: 'start', rotation: 90, font: { size: 10 } } },
                        lineK3: { type: 'line', xMin: labels.findIndex(l => parseFloat(l) >= k3), xMax: labels.findIndex(l => parseFloat(l) >= k3), borderColor: 'rgba(239, 68, 68, 0.3)', borderWidth: 1, borderDash: [4, 4], label: { display: true, content: `Call Sold K2 ${k3}`, position: 'start', rotation: 90, font: { size: 10 } } }
                    } : {
                        lineKM: { type: 'line', xMin: labels.findIndex(l => parseFloat(l) >= km), xMax: labels.findIndex(l => parseFloat(l) >= km), borderColor: 'rgba(59, 130, 246, 0.4)', borderWidth: 2, borderDash: [4, 4], label: { display: true, content: `Body ${km}`, position: 'start', rotation: 90 } }
                    })
                }
            }
        }
    };

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Combined P&L',
                data: dataCombo,
                borderColor: '#0ea5e9', // Sky Blue
                borderWidth: 3,
                tension: 0.1,
                fill: { target: 'origin', above: 'rgba(22, 163, 74, 0.15)', below: 'rgba(220, 38, 38, 0.15)' },
                pointRadius: 0,
                pointHoverRadius: 6,
                order: 1
            },
            {
                label: isCondor ? 'Bull Put Spread' : 'Left Wing Spread',
                data: dataLegLeft,
                borderColor: '#9ca3af', // Gray
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                order: 2
            },
            {
                label: isCondor ? 'Bear Call Spread' : 'Right Wing Spread',
                data: dataLegRight,
                borderColor: '#fca5a5', // Light Red
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0,
                order: 3
            }
        ]
    };

    return (
        <div className="my-10 font-sans not-prose bg-gray-50 rounded-2xl border border-gray-200 shadow-sm p-6 break-inside-avoid">
            <header className="mb-8 border-b border-gray-200 pb-4 text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-900">{config.title}</h2>
                <p className="text-gray-600 mt-2 text-sm">{config.desc}</p>
            </header>

            <div className="flex flex-col gap-6">

                {/* Chart Area */}
                <div className="w-full">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden relative">
                        <div className="overflow-x-auto">
                            <div className="h-[300px] md:h-[400px] p-2 md:p-4 min-w-[500px] relative">
                                <Line data={chartData} options={options} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Controls Area (Responsive Grid/Flex) */}
                <div className="flex flex-wrap gap-4 md:gap-6 items-start">

                    {isCondor ? (
                        <>
                            <ControlContainer title="Put Wing (Bull Put)">
                                <RangeControl label="Buy Put (K0)" value={k1} setValue={setK1} min={50} max={k2 - 1} />
                                <RangeControl label="Sell Put (K1)" value={k2} setValue={setK2} min={k1 + 1} max={k3 - 1} />
                                <RangeControl label="Credit Recv" value={creditPut} setValue={setCreditPut} min={0} max={10} step={0.1} />
                            </ControlContainer>
                            <ControlContainer title="Call Wing (Bear Call)" color="red">
                                <RangeControl label="Sell Call (K2)" value={k3} setValue={setK3} min={k2 + 1} max={k4 - 1} />
                                <RangeControl label="Buy Call (K3)" value={k4} setValue={setK4} min={k3 + 1} max={150} />
                                <RangeControl label="Credit Recv" value={creditCall} setValue={setCreditCall} min={0} max={10} step={0.1} />
                            </ControlContainer>
                        </>
                    ) : (
                        <>
                            {/* Butterfly Controls */}
                            <ControlContainer title="Butterfly Structure">
                                <RangeControl label="Body Strike (KM)" value={km} setValue={setKm} min={80} max={120} />
                                <RangeControl label="Wing Width" value={width} setValue={setWidth} min={2} max={20} />
                            </ControlContainer>
                            <ControlContainer title="Cost">
                                <RangeControl label="Net Debit" value={debit} setValue={setDebit} min={0.1} max={10} step={0.1} />
                            </ControlContainer>
                        </>
                    )}

                    {/* Stats Panel */}
                    <div className="flex-1 min-w-[260px] bg-white rounded-xl shadow border border-gray-200 p-5 self-stretch">
                        <h3 className="font-bold text-gray-700 border-b pb-2 mb-3 text-sm uppercase tracking-wider">关键指标</h3>
                        <div className="space-y-3 text-sm">
                            <StatRow label="策略构建" value={stats.entry} />
                            <StatRow label="最大收益" value={stats.maxProfit} color="text-green-600" />
                            <StatRow label="最大亏损" value={stats.maxLoss} color="text-red-600" />
                            <StatRow label="盈亏平衡点" value={stats.breakeven} color="text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Sub-components for cleaner render
const ControlContainer = ({ title, children, color = "blue" }) => {
    const theme = color === 'blue' ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-red-50 border-red-200 text-red-800";
    return (
        <div className={`flex-1 min-w-[280px] p-4 rounded-xl border relative ${theme}`}>
            <h4 className="font-bold mb-3 text-sm uppercase opacity-80">{title}</h4>
            <div className="space-y-4">{children}</div>
        </div>
    );
};

const RangeControl = ({ label, value, setValue, min, max, step = 1 }) => (
    <div>
        <div className="flex justify-between text-xs font-semibold mb-1">
            <span>{label}</span>
            <span className="font-mono">{value}</span>
        </div>
        <input type="range" min={min} max={max} step={step} value={value}
            onChange={(e) => setValue(Number(e.target.value))}
            className="w-full h-2 bg-white/50 rounded-lg appearance-none cursor-pointer accent-gray-800" />
    </div>
);

const StatRow = ({ label, value, color = "text-gray-800" }) => (
    <div className="flex justify-between items-center">
        <span className="text-gray-500">{label}</span>
        <span className={`font-bold ${color}`}>{value}</span>
    </div>
);

export default NeutralStrategyChart;
