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

// Strategy Configuration Map
const STRATEGY_CONFIG = {
    'bull-call-spread': {
        title: "牛市看涨价差 (Bull Call Spread)",
        desc: "买入低价 Call，卖出高价 Call",
        leg1: { label: "Leg 1: Long Call (K_L)", role: '买入低行权价 (保护)', type: 'long-call', color: 'blue' },
        leg2: { label: "Leg 2: Short Call (K_H)", role: '卖出高行权价 (收租)', type: 'short-call', color: 'red' },
        default: { kl: 90, pl: 8, kh: 110, ph: 2 },
        isDebit: true
    },
    'bull-put-spread': {
        title: "牛市看跌价差 (Bull Put Spread)",
        desc: "买入低价 Put，卖出高价 Put",
        leg1: { label: "Leg 1: Long Put (K_L)", role: '买入低行权价 (保护)', type: 'long-put', color: 'blue' },
        leg2: { label: "Leg 2: Short Put (K_H)", role: '卖出高行权价 (收租)', type: 'short-put', color: 'red' },
        default: { kl: 90, pl: 2, kh: 110, ph: 8 },
        isDebit: false // Credit Strategy
    },
    'bear-put-spread': {
        title: "熊市看跌价差 (Bear Put Spread)",
        desc: "买入高价 Put，卖出低价 Put",
        leg1: { label: "Leg 1: Short Put (K_L)", role: '卖出低行权价 (收租)', type: 'short-put', color: 'red' }, // KL
        leg2: { label: "Leg 2: Long Put (K_H)", role: '买入高行权价 (保护)', type: 'long-put', color: 'blue' }, // KH
        default: { kl: 90, pl: 2, kh: 110, ph: 8 },
        isDebit: true
    },
    'bear-call-spread': {
        title: "熊市看涨价差 (Bear Call Spread)",
        desc: "买入高价 Call，卖出低价 Call",
        leg1: { label: "Leg 1: Short Call (K_L)", role: '卖出低行权价 (收租)', type: 'short-call', color: 'red' },
        leg2: { label: "Leg 2: Long Call (K_H)", role: '买入高行权价 (保护)', type: 'long-call', color: 'blue' },
        default: { kl: 90, pl: 8, kh: 110, ph: 2 },
        isDebit: false // Credit Strategy
    }
};

const VerticalSpreadChart = ({ strategy = 'bull-call' }) => {
    const config = STRATEGY_CONFIG[strategy];
    if (!config) return <div>Invalid Strategy Type</div>;

    // State for inputs
    const [kl, setKl] = useState(config.default.kl);
    const [pl, setPl] = useState(config.default.pl);
    const [kh, setKh] = useState(config.default.kh);
    const [ph, setPh] = useState(config.default.ph);

    // --- Constraints Logic ---

    // 1. Strike Monotonicity: KL always < KH
    useEffect(() => {
        if (kl >= kh) setKh(kl + 5);
    }, [kl]);

    useEffect(() => {
        if (kh <= kl) setKl(kh - 5);
    }, [kh]);

    // 2. Premium Monotonicity (Financial Logic)
    // Call: Lower Strike (KL) is MORE expensive than Higher Strike (KH). PL > PH.
    // Put:  Lower Strike (KL) is LESS expensive than Higher Strike (KH). PL < PH.
    const isCall = strategy.includes('call');

    useEffect(() => {
        if (isCall) {
            // Call: PL should be > PH
            if (pl <= ph) setPh(Math.max(0.5, pl - 0.5));
        } else {
            // Put: PL should be < PH
            if (pl >= ph) setPh(pl + 0.5);
        }
    }, [pl, isCall]);

    useEffect(() => {
        if (isCall) {
            // Call: PH should be < PL
            if (ph >= pl) setPl(ph + 0.5);
        } else {
            // Put: PH should be > PL
            if (ph <= pl) setPl(Math.max(0.5, ph - 0.5));
        }
    }, [ph, isCall]);


    // --- Calculation Logic ---

    const { labels, dataLeg1, dataLeg2, dataCombo, stats } = useMemo(() => {
        const rangeMin = Math.min(kl, kh) * 0.7;
        const rangeMax = Math.max(kl, kh) * 1.3;
        const steps = 150;

        const labels = [];
        const dataLeg1 = [];
        const dataLeg2 = [];
        const dataCombo = [];

        // Determine net debit/credit and max loss/profit based on strategy
        // Simplified Logic: Just calculate P&L of the two legs directly

        // Define Payoff Functions
        // Leg 1 corresponds to KL options, Leg 2 corresponds to KH options
        // But we need to check which role (Long/Short) is assigned to KL and KH in this strategy

        // Let's standardise variables for calculation loop
        // We have 4 vars: KL, PL, KH, PH.
        // We need to know: Is KL a Call/Put? Is it Long/Short?

        for (let i = 0; i <= steps; i++) {
            const s = rangeMin + (rangeMax - rangeMin) * (i / steps);
            labels.push(s.toFixed(1));

            let v1 = 0, v2 = 0;

            // Leg 1 calc (Associated with KL)
            if (config.leg1.type === 'long-call') v1 = Math.max(s - kl, 0) - pl;
            else if (config.leg1.type === 'short-call') v1 = pl - Math.max(s - kl, 0);
            else if (config.leg1.type === 'long-put') v1 = Math.max(kl - s, 0) - pl;
            else if (config.leg1.type === 'short-put') v1 = pl - Math.max(kl - s, 0);

            // Leg 2 calc (Associated with KH)
            if (config.leg2.type === 'long-call') v2 = Math.max(s - kh, 0) - ph;
            else if (config.leg2.type === 'short-call') v2 = ph - Math.max(s - kh, 0);
            else if (config.leg2.type === 'long-put') v2 = Math.max(kh - s, 0) - ph;
            else if (config.leg2.type === 'short-put') v2 = ph - Math.max(kh - s, 0);

            dataLeg1.push(v1);
            dataLeg2.push(v2);
            dataCombo.push(v1 + v2);
        }

        // Stats Calculation
        let sNet = 0, sMaxLoss = 0, sMaxProfit = 0, sBreakeven = 0;
        const width = kh - kl;

        switch (strategy) {
            case 'bull-call': // Long KL(PL) + Short KH(PH). Debit = PL - PH.
                sNet = pl - ph; // Debit
                sMaxLoss = sNet;
                sMaxProfit = width - sNet;
                sBreakeven = kl + sNet;
                break;
            case 'bull-put': // Long KL(PL) + Short KH(PH). Credit = PH - PL.
                sNet = ph - pl; // Credit
                sMaxProfit = sNet;
                sMaxLoss = width - sNet;
                sBreakeven = kh - sNet;
                break;
            case 'bear-put': // Short KL(PL) + Long KH(PH). Debit = PH - PL.
                sNet = ph - pl; // Debit
                sMaxLoss = sNet;
                sMaxProfit = width - sNet;
                sBreakeven = kh - sNet;
                break;
            case 'bear-call': // Short KL(PL) + Long KH(PH). Credit = PL - PH.
                sNet = pl - ph; // Credit
                sMaxProfit = sNet;
                sMaxLoss = width - sNet;
                sBreakeven = kl + sNet;
                break;
        }

        const stats = {
            net: sNet.toFixed(2),
            maxLoss: sMaxLoss.toFixed(2),
            maxProfit: sMaxProfit.toFixed(2),
            breakeven: sBreakeven.toFixed(2),
            isDebit: (strategy === 'bull-call' || strategy === 'bear-put')
        };

        return { labels, dataLeg1, dataLeg2, dataCombo, stats };
    }, [kl, pl, kh, ph, strategy, config]);


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
                        xMin: labels.findIndex(l => parseFloat(l) >= kl),
                        xMax: labels.findIndex(l => parseFloat(l) >= kl),
                        borderColor: 'rgba(59, 130, 246, 0.4)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        label: { display: true, content: `K_L ${kl}`, position: 'start', rotation: '90' }
                    },
                    line2: {
                        type: 'line',
                        xMin: labels.findIndex(l => parseFloat(l) >= kh),
                        xMax: labels.findIndex(l => parseFloat(l) >= kh),
                        borderColor: 'rgba(239, 68, 68, 0.4)',
                        borderWidth: 1,
                        borderDash: [5, 5],
                        label: { display: true, content: `K_H ${kh}`, position: 'start', rotation: '90' }
                    }
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
                borderColor: '#16a34a',
                borderWidth: 3,
                order: 1,
                tension: 0.1,
                fill: { target: 'origin', above: 'rgba(22, 163, 74, 0.15)', below: 'rgba(220, 38, 38, 0.15)' },
                pointRadius: 0,
                pointHoverRadius: 6
            },
            {
                label: config.leg1.label,
                data: dataLeg1,
                borderColor: config.leg1.color === 'blue' ? '#93c5fd' : '#fca5a5',
                borderWidth: 2,
                borderDash: [5, 5],
                order: 2,
                pointRadius: 0
            },
            {
                label: config.leg2.label,
                data: dataLeg2,
                borderColor: config.leg2.color === 'blue' ? '#93c5fd' : '#fca5a5',
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

                {/* Chart Area - Prominent and on top for mobile/narrow columns */}
                <div className="w-full">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-2 md:p-4 h-[300px] md:h-[400px] relative">
                        <Line data={chartData} options={options} />
                    </div>
                </div>

                {/* Controls & Stats Area */}
                <div className="flex flex-wrap gap-4 md:gap-6 items-stretch">

                    {/* Leg 1 Control (K_L) */}
                    <ControlBox
                        className="flex-1 min-w-[260px]"
                        title={config.leg1.role}
                        color={config.leg1.color}
                        strike={kl} setStrike={setKl} strikeLabel="行权价 (K_L)"
                        premium={pl} setPremium={setPl} premiumLabel={config.leg1.type.includes('long') ? "权利金支出" : "权利金收入"}
                    />

                    {/* Leg 2 Control (K_H) */}
                    <ControlBox
                        className="flex-1 min-w-[260px]"
                        title={config.leg2.role}
                        color={config.leg2.color}
                        strike={kh} setStrike={setKh} strikeLabel="行权价 (K_H)"
                        premium={ph} setPremium={setPh} premiumLabel={config.leg2.type.includes('long') ? "权利金支出" : "权利金收入"}
                    />

                    {/* Stats Panel */}
                    <div className="flex-1 min-w-[260px] bg-white rounded-xl shadow border border-gray-200 p-5">
                        <h3 className="font-bold text-gray-700 border-b pb-2 mb-3 text-sm uppercase tracking-wider">策略关键指标</h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">{stats.isDebit ? '净成本 (Net Debit)' : '净收入 (Net Credit)'}</span>
                                <span className="font-bold text-gray-800">${stats.net}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">最大亏损 (Max Loss)</span>
                                <span className="font-bold text-red-600">${stats.maxLoss}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">最大收益 (Max Profit)</span>
                                <span className="font-bold text-green-600">${stats.maxProfit}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">盈亏平衡点 (Breakeven)</span>
                                <span className="font-bold text-blue-600">${stats.breakeven}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ControlBox = ({ className, title, color, strike, setStrike, strikeLabel, premium, setPremium, premiumLabel }) => {
    const theme = color === 'blue' ?
        { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', accent: 'accent-blue-600', badge: 'bg-blue-600' } :
        { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', accent: 'accent-red-600', badge: 'bg-red-600' };

    return (
        <div className={`${theme.bg} rounded-xl p-5 border ${theme.border} shadow-sm relative ${className || ''}`}>
            <div className={`absolute -top-3 left-4 ${theme.badge} text-white text-xs font-bold px-2 py-1 rounded`}>
                {title}
            </div>
            <div className="space-y-4 mt-2">
                <div>
                    <label className={`flex justify-between text-sm font-semibold ${theme.text} mb-1`}>
                        {strikeLabel}
                        <span className="font-mono">{strike}</span>
                    </label>
                    <input type="range" min="50" max="150" value={strike} step="1"
                        onChange={(e) => setStrike(Number(e.target.value))}
                        className={`w-full h-2 bg-white/50 rounded-lg appearance-none cursor-pointer ${theme.accent}`} />
                </div>
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

export default VerticalSpreadChart;
