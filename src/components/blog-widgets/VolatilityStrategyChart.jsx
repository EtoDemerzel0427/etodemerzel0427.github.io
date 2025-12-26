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
    'long-straddle': {
        title: "买入跨式 (Long Straddle)",
        desc: "同时买入相同行权价 K 的 Call 和 Put",
        type: 'straddle',
        default: { k: 100, pc: 5, pp: 5 } // K, Call Premium, Put Premium
    },
    'long-strangle': {
        title: "买入宽跨式 (Long Strangle)",
        desc: "买入较低行权价的 Put 和较高行权价的 Call",
        type: 'strangle',
        default: { kl: 90, kh: 110, pp: 4, pc: 4 } // KL(Put), KH(Call), Put Premium, Call Premium
    }
};

const VolatilityStrategyChart = ({ strategy = 'long-straddle' }) => {
    const config = STRATEGY_CONFIG[strategy];
    const isStraddle = config.type === 'straddle';

    // State
    // Straddle uses: k, pc, pp
    // Strangle uses: kl, kh, pc, pp
    const [k, setK] = useState(config.default.k || 100); // For Straddle
    const [kl, setKl] = useState(config.default.kl || 90); // For Strangle Put Leg
    const [kh, setKh] = useState(config.default.kh || 110); // For Strangle Call Leg

    // Premiums
    const [pc, setPc] = useState(config.default.pc || 5);
    const [pp, setPp] = useState(config.default.pp || 5);

    // --- Constraints Logic ---
    useEffect(() => {
        if (!isStraddle) {
            // Strangle: KL (Put Strike) must be < KH (Call Strike)
            if (kl >= kh) setKh(kl + 5);
        }
    }, [kl, isStraddle]);

    useEffect(() => {
        if (!isStraddle) {
            // Strangle: KH (Call Strike) must be > KL (Put Strike)
            if (kh <= kl) setKl(kh - 5);
        }
    }, [kh, isStraddle]);


    // --- Calculation Logic ---

    const { labels, dataLegCall, dataLegPut, dataCombo, stats } = useMemo(() => {
        const center = isStraddle ? k : (kl + kh) / 2;
        const rangeMin = center * 0.7;
        const rangeMax = center * 1.3;
        const steps = 150;

        const labels = [];
        const dataLegCall = [];
        const dataLegPut = [];
        const dataCombo = [];

        // Determine Effective Strikes for loop
        // Straddle: Call Strike = K, Put Strike = K
        // Strangle: Call Strike = KH, Put Strike = KL
        const callStrike = isStraddle ? k : kh;
        const putStrike = isStraddle ? k : kl;

        for (let i = 0; i <= steps; i++) {
            const s = rangeMin + (rangeMax - rangeMin) * (i / steps);
            labels.push(s.toFixed(1));

            // Long Call Payoff: Max(S - K_call, 0) - Price_call
            const valCall = Math.max(s - callStrike, 0) - pc;

            // Long Put Payoff: Max(K_put - S, 0) - Price_put
            const valPut = Math.max(putStrike - s, 0) - pp;

            const valCombo = valCall + valPut;

            dataLegCall.push(valCall);
            dataLegPut.push(valPut);
            dataCombo.push(valCombo);
        }

        // Stats
        const totalDebit = pc + pp;
        const maxLoss = totalDebit; // Max loss is the debit paid (when spot is between strikes for strangle, or at strike for straddle)

        let breakevenUpper, breakevenLower;
        if (isStraddle) {
            breakevenUpper = k + totalDebit;
            breakevenLower = k - totalDebit;
        } else {
            breakevenUpper = kh + totalDebit;
            breakevenLower = kl - totalDebit;
        }

        const stats = {
            netDebit: totalDebit.toFixed(2),
            maxLoss: maxLoss.toFixed(2),
            breakevenLow: breakevenLower.toFixed(2),
            breakevenHigh: breakevenUpper.toFixed(2)
        };

        return { labels, dataLegCall, dataLegPut, dataCombo, stats, callStrike, putStrike };
    }, [isStraddle, k, kl, kh, pc, pp]);


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
                    line1: {
                        type: 'line',
                        // Draw line at Put Strike
                        xMin: labels.findIndex(l => parseFloat(l) >= (isStraddle ? k : kl)),
                        xMax: labels.findIndex(l => parseFloat(l) >= (isStraddle ? k : kl)),
                        borderColor: 'rgba(59, 130, 246, 0.4)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        label: { display: true, content: isStraddle ? `Strike ${k}` : `Put K ${kl}`, position: 'start', rotation: '90' }
                    },
                    // Only draw second line for Strangle
                    ...(!isStraddle ? {
                        line2: {
                            type: 'line',
                            xMin: labels.findIndex(l => parseFloat(l) >= kh),
                            xMax: labels.findIndex(l => parseFloat(l) >= kh),
                            borderColor: 'rgba(239, 68, 68, 0.4)',
                            borderWidth: 1,
                            borderDash: [5, 5],
                            label: { display: true, content: `Call K ${kh}`, position: 'start', rotation: '90' }
                        }
                    } : {})
                }
            }
        }
    };

    const chartData = {
        labels,
        datasets: [
            {
                label: 'Combo P&L',
                data: dataCombo,
                borderColor: '#8b5cf6', // Violet
                borderWidth: 3,
                order: 1,
                tension: 0.1,
                fill: { target: 'origin', above: 'rgba(139, 92, 246, 0.15)', below: 'rgba(239, 68, 68, 0.15)' },
                pointRadius: 0,
                pointHoverRadius: 6
            },
            {
                label: 'Long Put Leg',
                data: dataLegPut,
                borderColor: '#fca5a5', // Light Red
                borderWidth: 2,
                borderDash: [5, 5],
                order: 2,
                pointRadius: 0
            },
            {
                label: 'Long Call Leg',
                data: dataLegCall,
                borderColor: '#93c5fd', // Light Blue
                borderWidth: 2,
                borderDash: [5, 5],
                order: 3,
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

                {/* Controls & Stats Area */}
                <div className="flex flex-wrap gap-4 md:gap-6 items-stretch">

                    {/* Leg 1 Control (Put or Straddle Strike) */}
                    <ControlBox
                        className="flex-1 min-w-[260px]"
                        title={isStraddle ? "Straddle Legs" : "Leg 1: Long Put"}
                        color="red"
                        strike={isStraddle ? k : kl}
                        setStrike={isStraddle ? setK : setKl}
                        strikeLabel={isStraddle ? "行权价 (K)" : "Put 行权价 (K_L)"}
                        premium={pp} setPremium={setPp} premiumLabel="Put 权利金"
                    />

                    {/* Leg 2 Control (Call or just Call Premium for straddle) */}
                    <ControlBox
                        className="flex-1 min-w-[260px]"
                        title={isStraddle ? "Call Side Cost" : "Leg 2: Long Call"}
                        color="blue"
                        // For Straddle, we don't show specific KH slider, just PC.
                        // But ControlBox expects strike props. 
                        // I'll make strike optional in ControlBox or just hide it?
                        // Better to make ControlBox flexible. 
                        // For now, let's just reuse the structure but maybe disable the strike input for Straddle on this side?
                        // Or better: For Straddle, just combine inputs leg 1 and 2? 
                        // But we need 2 premium inputs. 
                        // So: 
                        // Side 1: K and Put Premium
                        // Side 2: Call Premium (Strike is locked/hidden)

                        hideStrike={isStraddle}
                        strike={isStraddle ? k : kh}
                        setStrike={setKh}
                        strikeLabel="Call 行权价 (K_H)"
                        premium={pc} setPremium={setPc} premiumLabel="Call 权利金"
                    />

                    {/* Stats Panel */}
                    <div className="flex-1 min-w-[260px] bg-white rounded-xl shadow border border-gray-200 p-5">
                        <h3 className="font-bold text-gray-700 border-b pb-2 mb-3 text-sm uppercase tracking-wider">策略关键指标</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">总成本 (Total Debit)</span>
                                <span className="font-bold text-gray-800">${stats.netDebit}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">最大亏损 (Max Loss)</span>
                                <span className="font-bold text-red-600">${stats.maxLoss}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">下行盈亏平衡 (Low BE)</span>
                                <span className="font-bold text-blue-600">${stats.breakevenLow}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">上行盈亏平衡 (High BE)</span>
                                <span className="font-bold text-blue-600">${stats.breakevenHigh}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ControlBox = ({ className, title, color, strike, setStrike, strikeLabel, premium, setPremium, premiumLabel, hideStrike }) => {
    const theme = color === 'blue' ?
        { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', accent: 'accent-blue-600', badge: 'bg-blue-600' } :
        { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', accent: 'accent-red-600', badge: 'bg-red-600' };

    return (
        <div className={`${theme.bg} rounded-xl p-5 border ${theme.border} shadow-sm relative ${className || ''}`}>
            <div className={`absolute -top-3 left-4 ${theme.badge} text-white text-xs font-bold px-2 py-1 rounded`}>
                {title}
            </div>
            <div className="space-y-4 mt-2">
                {!hideStrike && (
                    <div>
                        <label className={`flex justify-between text-sm font-semibold ${theme.text} mb-1`}>
                            {strikeLabel}
                            <span className="font-mono">{strike}</span>
                        </label>
                        <input type="range" min="50" max="150" value={strike} step="1"
                            onChange={(e) => setStrike(Number(e.target.value))}
                            className={`w-full h-2 bg-white/50 rounded-lg appearance-none cursor-pointer ${theme.accent}`} />
                    </div>
                )}
                <div>
                    <label className={`flex justify-between text-sm font-semibold ${theme.text} mb-1`}>
                        {premiumLabel}
                        <span className="font-mono">{premium}</span>
                    </label>
                    <input type="range" min="0.5" max="25" value={premium} step="0.5"
                        onChange={(e) => setPremium(Number(e.target.value))}
                        className={`w-full h-2 bg-white/50 rounded-lg appearance-none cursor-pointer ${theme.accent}`} />
                </div>
            </div>
        </div>
    );
};

export default VolatilityStrategyChart;
