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
    'covered-call': {
        title: "备兑开仓 (Covered Call)",
        desc: "持有现货 + 卖出看涨期权",
        type: 'covered-call',
        default: { entry: 100, k: 110, credit: 3 }
    },
    'covered-put': {
        title: "备兑看跌 (Covered Put)",
        desc: "做空现货 + 卖出看跌期权",
        type: 'covered-put',
        default: { entry: 100, k: 90, credit: 3 }
    },
    'covered-combo': {
        title: "Covered Combo (Covered Strangle)",
        desc: "持有现货 + 卖出虚值 Call + 卖出虚值 Put (接飞刀)",
        type: 'covered-combo',
        default: { entry: 100, kl: 90, kh: 110, credit: 6 } // Combined credit of call+put
    }
};

const CoveredStrategyChart = ({ strategy = 'covered-call' }) => {
    const config = STRATEGY_CONFIG[strategy];
    const type = config.type;
    const isCombo = type === 'covered-combo';

    // State
    const [entry, setEntry] = useState(config.default.entry || 100);
    const [k, setK] = useState(config.default.k || 110); // Standard K for Call/Put
    const [kl, setKl] = useState(config.default.kl || 90); // Low Strike for Combo
    const [kh, setKh] = useState(config.default.kh || 110); // High Strike for Combo
    const [credit, setCredit] = useState(config.default.credit || 3);

    // --- Constraints Logic ---
    useEffect(() => {
        if (isCombo) {
            if (kl >= kh) setKh(kl + 5);
        }
    }, [kl, kh, isCombo]);

    // --- Calculation Logic ---
    const { labels, dataCombo, dataLegStock, dataLegOption, stats, chartMin, chartMax } = useMemo(() => {
        // Center view around entry price
        const center = entry;
        const rangeWidth = entry * 0.5; // +/- 25% ? No, let's do +/- 40%
        const rangeMin = center * 0.6;
        const rangeMax = center * 1.4;
        const steps = 150;

        const labels = [];
        const dataCombo = [];
        const dataLegStock = []; // Stock P&L only
        const dataLegOption = []; // Option P&L only

        for (let i = 0; i <= steps; i++) {
            const s = rangeMin + (rangeMax - rangeMin) * (i / steps);
            labels.push(s.toFixed(1));

            // 1. Stock P&L
            let stockPnL = 0;
            if (type === 'covered-put') {
                stockPnL = entry - s; // Short Stock
            } else {
                stockPnL = s - entry; // Long Stock (Call & Combo)
            }

            // 2. Option P&L
            let optionPnL = 0;
            if (type === 'covered-call') {
                // Short Call: Credit - Max(S - K, 0)
                optionPnL = credit - Math.max(s - k, 0);
            } else if (type === 'covered-put') {
                // Short Put: Credit - Max(K - S, 0)
                optionPnL = credit - Math.max(k - s, 0);
            } else if (type === 'covered-combo') {
                // Short Call KH + Short Put KL
                // Value = Credit - Max(S - KH, 0) - Max(KL - S, 0)
                optionPnL = credit - Math.max(s - kh, 0) - Math.max(kl - s, 0);
            }

            dataLegStock.push(stockPnL);
            dataLegOption.push(optionPnL);
            dataCombo.push(stockPnL + optionPnL);
        }

        // Stats
        let statsRes = {};
        if (type === 'covered-call') {
            const maxProfit = (k - entry) + credit;
            const breakeven = entry - credit;
            const maxLoss = (entry - credit); // If stock goes to 0
            statsRes = {
                maxProfit: `$${maxProfit.toFixed(2)}`,
                maxLoss: `Stock Value - Credit ($${maxLoss.toFixed(2)})`,
                breakeven: `$${breakeven.toFixed(2)}`,
                note: "Upside Capped"
            };
        } else if (type === 'covered-put') {
            const maxProfit = (entry - k) + credit;
            const breakeven = entry + credit;
            const maxLoss = "Unlimited (Upside Risk)";
            statsRes = {
                maxProfit: `$${maxProfit.toFixed(2)}`,
                maxLoss: maxLoss,
                breakeven: `$${breakeven.toFixed(2)}`,
                note: "Downside Capped"
            };
        } else if (type === 'covered-combo') {
            // Covered Strangle
            // Max Profit: If stock between KL and KH. Stock profit (S-Entry) varies.
            // Actually, stock profit is linear. Option profit is fixed credit.
            // Wait, Max Profit occurs at KH. At KH, Stock up (KH-Entry) + Credit. Option expires worthless.
            const maxProfit = (kh - entry) + credit;

            // Breakeven: Stock Loss =  Option Gain (Credit).
            // S - Entry + Credit = 0 => S = Entry - Credit.
            // BUT, below KL, Put loss kicks in (-1 slope). Stock loses (-1 slope). Total slope -2.
            // BE is likely just Entry - Credit?
            // At KL: Stock PnL = KL - Entry. Option = Credit.
            // Below KL: Loss accelerates. 
            // Total PnL = (S - Entry) + Credit - (KL - S) = 2S - Entry - KL + Credit.
            // Set to 0: 2S = Entry + KL - Credit => S = (Entry + KL - Credit) / 2.
            // Oh right, "Catching a falling knife" means you own 2x stock effectively.
            const be = (entry + kl - credit) / 2;

            statsRes = {
                maxProfit: `$${maxProfit.toFixed(2)} (at ${kh})`,
                maxLoss: "Stock goes to 0 (Accel Loss)",
                breakeven: `$${be.toFixed(2)}`, // Approx
                note: "2x Downside Risk below KL"
            };
        }

        return { labels, dataCombo, dataLegStock, dataLegOption, stats: statsRes, chartMin: rangeMin, chartMax: rangeMax };
    }, [type, entry, k, kl, kh, credit]);


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
            tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: $${ctx.parsed.y.toFixed(2)}` } },
            annotation: {
                annotations: {
                    entryLine: {
                        type: 'line',
                        xMin: labels.findIndex(l => parseFloat(l) >= entry),
                        xMax: labels.findIndex(l => parseFloat(l) >= entry),
                        borderColor: 'rgba(107, 114, 128, 0.5)',
                        borderWidth: 2,
                        borderDash: [2, 2],
                        label: { display: true, content: `Entry ${entry}`, position: 'start', rotation: 90, font: { size: 10 }, color: 'gray' }
                    },
                    ...(!isCombo ? {
                        strikeLine: {
                            type: 'line',
                            xMin: labels.findIndex(l => parseFloat(l) >= k),
                            xMax: labels.findIndex(l => parseFloat(l) >= k),
                            borderColor: 'rgba(239, 68, 68, 0.4)',
                            borderWidth: 1,
                            borderDash: [5, 5],
                            label: { display: true, content: `Strike ${k}`, position: 'start', rotation: 90, font: { size: 10 } }
                        }
                    } : {
                        lineKL: { type: 'line', xMin: labels.findIndex(l => parseFloat(l) >= kl), xMax: labels.findIndex(l => parseFloat(l) >= kl), borderColor: 'rgba(239, 68, 68, 0.4)', borderWidth: 1, borderDash: [5, 5], label: { display: true, content: `Put K ${kl}`, position: 'start', rotation: 90, font: { size: 10 } } },
                        lineKH: { type: 'line', xMin: labels.findIndex(l => parseFloat(l) >= kh), xMax: labels.findIndex(l => parseFloat(l) >= kh), borderColor: 'rgba(239, 68, 68, 0.4)', borderWidth: 1, borderDash: [5, 5], label: { display: true, content: `Call K ${kh}`, position: 'start', rotation: 90, font: { size: 10 } } }
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
                zIndex: 10
            },
            {
                label: 'Stock Only',
                data: dataLegStock,
                borderColor: '#9ca3af', // Gray
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0
            },
            {
                label: 'Option Leg',
                data: dataLegOption,
                borderColor: '#fca5a5', // Light Red
                borderWidth: 2,
                borderDash: [5, 5],
                pointRadius: 0
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
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2 md:p-4 h-[300px] md:h-[400px] relative">
                        <Line data={chartData} options={options} />
                    </div>
                </div>

                {/* Controls Area */}
                <div className="flex flex-wrap gap-4 md:gap-6 items-start">

                    <ControlContainer title="Position Setup">
                        <RangeControl label="Stock Entry Price" value={entry} setValue={setEntry} min={50} max={150} />
                        <RangeControl label="Credit Received" value={credit} setValue={setCredit} min={0.5} max={20} step={0.5} />
                    </ControlContainer>

                    {isCombo ? (
                        <ControlContainer title="Strangle Strikes" color="red">
                            <RangeControl label="Sell Put (K_L)" value={kl} setValue={setKl} min={50} max={kh - 5} />
                            <RangeControl label="Sell Call (K_H)" value={kh} setValue={setKh} min={kl + 5} max={200} />
                        </ControlContainer>
                    ) : (
                        <ControlContainer title="Option Leg" color="red">
                            <RangeControl label="Strike Price (K)" value={k} setValue={setK} min={50} max={200} />
                        </ControlContainer>
                    )}

                    {/* Stats Panel */}
                    <div className="flex-1 min-w-[260px] bg-white rounded-xl shadow border border-gray-200 p-5 self-stretch">
                        <h3 className="font-bold text-gray-700 border-b pb-2 mb-3 text-sm uppercase tracking-wider">关键指标</h3>
                        <div className="space-y-3 text-sm">
                            <StatRow label="盈亏平衡点" value={stats.breakeven} color="text-blue-600" />
                            <StatRow label="最大收益" value={stats.maxProfit} color="text-green-600" />
                            <div className="flex justify-between items-center">
                                <span className="text-gray-500">最大亏损</span>
                                <span className="font-bold text-red-600 text-right">{stats.maxLoss}</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-2 italic border-t pt-2">
                                Note: {stats.note}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Reuse sub-components logic (duplicated for isolation)
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

export default CoveredStrategyChart;
