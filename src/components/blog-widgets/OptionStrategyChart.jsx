import React, { useState, useEffect, useMemo } from 'react';
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

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const OptionStrategyChart = () => {
    // State for inputs
    const [k, setK] = useState(100);
    const [p, setP] = useState(5);

    // Common chart options
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false,
        },
        scales: {
            x: {
                display: true,
                grid: { display: false }
            },
            y: {
                display: true,
                grid: { color: '#f3f4f6' },
                // dynamic min/max will be handled by chart.js auto-scaling or we can force it if needed
                // keeping it auto for simplicity or matching user's logic
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: function (context) {
                        return `P&L: $${context.parsed.y.toFixed(2)}`;
                    }
                }
            }
        }
    };

    // Calculate Data
    const { labels, dataLC, dataSC, dataLP, dataSP, stats } = useMemo(() => {
        const rangeMin = k * 0.5;
        const rangeMax = k * 1.5;
        const steps = 100;
        const labels = [];
        const dataLC = [];
        const dataSC = [];
        const dataLP = [];
        const dataSP = [];

        for (let i = 0; i <= steps; i++) {
            const s = rangeMin + (rangeMax - rangeMin) * (i / steps);
            labels.push(s.toFixed(1));

            // 1. Long Call: max(S - K, 0) - P
            dataLC.push(Math.max(s - k, 0) - p);

            // 2. Short Call: P - max(S - K, 0)
            dataSC.push(p - Math.max(s - k, 0));

            // 3. Long Put: max(K - S, 0) - P
            dataLP.push(Math.max(k - s, 0) - p);

            // 4. Short Put: P - max(K - S, 0)
            dataSP.push(p - Math.max(k - s, 0));
        }

        const stats = {
            lc: {
                maxLoss: p.toFixed(2),
                breakeven: (k + p).toFixed(2)
            },
            sc: {
                maxProfit: p.toFixed(2),
                breakeven: (k + p).toFixed(2)
            },
            lp: {
                maxProfit: (k - p).toFixed(2),
                maxLoss: p.toFixed(2),
                breakeven: (k - p).toFixed(2)
            },
            sp: {
                maxProfit: p.toFixed(2),
                maxLoss: (k - p).toFixed(2),
                breakeven: (k - p).toFixed(2)
            }
        };

        return { labels, dataLC, dataSC, dataLP, dataSP, stats };
    }, [k, p]);


    // Helper to create dataset object
    const createDataset = (data, color) => ({
        labels,
        datasets: [{
            data,
            borderColor: color,
            borderWidth: 2,
            pointRadius: 0,
            fill: {
                target: 'origin',
                above: 'rgba(34, 197, 94, 0.2)', // Green
                below: 'rgba(239, 68, 68, 0.2)'  // Red
            }
        }]
    });

    // Dynamic Y-axis scale to keep charts stable and slope visual consistent
    // X-axis range is proportional to k (span = k), so Y-axis should also be proportional to k.
    const dynamicOptions = {
        ...options,
        scales: {
            ...options.scales,
            y: {
                ...options.scales.y,
                min: -k * 0.6,
                max: k * 0.6
            }
        }
    };

    return (
        <div className="my-8 font-sans not-prose">
            <div className="max-w-7xl mx-auto bg-gray-100 text-gray-800 p-4 md:p-6 rounded-xl border border-gray-200">
                {/* Header */}
                <header className="mb-6 text-center">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2 mt-0">期权四大基本策略全景图</h2>
                    <p className="text-gray-600">调整参数，观察买方(Long)与卖方(Short)的镜像关系</p>
                </header>

                {/* Controls */}
                <div className="bg-white rounded-xl shadow-sm p-4 mb-6 border border-gray-200 sticky top-0 z-10 opacity-95">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Strike Price Control */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                行权价 (Strike, K): <span className="text-blue-600 text-lg">{k}</span>
                            </label>
                            <input
                                type="range"
                                min="50" max="150" value={k} step="5"
                                onChange={(e) => setK(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>
                        {/* Premium Control */}
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-1">
                                权利金 (Premium, P): <span className="text-blue-600 text-lg">{p}</span>
                            </label>
                            <input
                                type="range"
                                min="1" max="20" value={p} step="0.5"
                                onChange={(e) => setP(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                        </div>
                    </div>
                </div>

                {/* Charts Grid (Responsive Auto-Fit) */}
                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">

                    {/* 1. Long Call */}
                    <ChartCard
                        title="1. Long Call (买入看涨)"
                        desc="看大涨 / 风险有限 / 收益无限"
                        role="权利方"
                        roleColor="bg-blue-200 text-blue-800"
                        borderColor="border-blue-500"
                        headerBg="bg-blue-50"
                        data={createDataset(dataLC, '#2563eb')}
                        options={dynamicOptions}
                        stats={[
                            { label: '最大收益', value: '无限 (∞)', valColor: 'text-green-600' },
                            { label: '最大亏损', value: `-$${stats.lc.maxLoss}`, valColor: 'text-red-600' },
                            { label: '盈亏平衡', value: `$${stats.lc.breakeven}`, valColor: 'text-gray-800' },
                        ]}
                    />

                    {/* 2. Short Call */}
                    <ChartCard
                        title="2. Short Call (卖出看涨)"
                        desc="看不涨 / 收益有限 / 风险无限"
                        role="义务方"
                        roleColor="bg-red-200 text-red-800"
                        borderColor="border-red-500"
                        headerBg="bg-red-50"
                        data={createDataset(dataSC, '#dc2626')}
                        options={dynamicOptions}
                        stats={[
                            { label: '最大收益', value: `+$${stats.sc.maxProfit}`, valColor: 'text-green-600' },
                            { label: '最大亏损', value: '无限 (∞)', valColor: 'text-red-600' },
                            { label: '盈亏平衡', value: `$${stats.sc.breakeven}`, valColor: 'text-gray-800' },
                        ]}
                    />

                    {/* 3. Long Put */}
                    <ChartCard
                        title="3. Long Put (买入看跌)"
                        desc="看大跌 / 风险有限 / 收益巨大"
                        role="权利方"
                        roleColor="bg-blue-200 text-blue-800"
                        borderColor="border-blue-500"
                        headerBg="bg-blue-50"
                        data={createDataset(dataLP, '#2563eb')}
                        options={dynamicOptions}
                        stats={[
                            { label: '最大收益', value: `+$${stats.lp.maxProfit}`, valColor: 'text-green-600' },
                            { label: '最大亏损', value: `-$${stats.lp.maxLoss}`, valColor: 'text-red-600' },
                            { label: '盈亏平衡', value: `$${stats.lp.breakeven}`, valColor: 'text-gray-800' },
                        ]}
                    />

                    {/* 4. Short Put */}
                    <ChartCard
                        title="4. Short Put (卖出看跌)"
                        desc="看不跌 / 收益有限 / 风险巨大"
                        role="义务方"
                        roleColor="bg-red-200 text-red-800"
                        borderColor="border-red-500"
                        headerBg="bg-red-50"
                        data={createDataset(dataSP, '#dc2626')}
                        options={dynamicOptions}
                        stats={[
                            { label: '最大收益', value: `+$${stats.sp.maxProfit}`, valColor: 'text-green-600' },
                            { label: '最大亏损', value: `-$${stats.sp.maxLoss}`, valColor: 'text-red-600' },
                            { label: '盈亏平衡', value: `$${stats.sp.breakeven}`, valColor: 'text-gray-800' },
                        ]}
                    />
                </div>

                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>绿色区域 = 盈利 (Profit) | 红色区域 = 亏损 (Loss)</p>
                    <p className="mt-1">注意观察：每一行的左右两张图是互为镜像的（零和博弈）。</p>
                </div>
            </div>
        </div>
    );
};

const ChartCard = ({ title, desc, role, roleColor, borderColor, headerBg, data, options, stats }) => (
    <div className={`bg-white rounded-xl shadow-lg border-t-4 ${borderColor} overflow-hidden flex flex-col`}>
        <div className={`p-3 ${headerBg} border-b flex justify-between items-start gap-2`}>
            <div className="min-w-0">
                <h3 className="font-bold text-lg text-gray-800 m-0 leading-tight truncate" title={title}>{title}</h3>
                <p className="text-xs text-gray-500 m-0 mt-1 truncate" title={desc}>{desc}</p>
            </div>
            <span className={`text-xs font-bold ${roleColor} px-2 py-1 rounded shrink-0 whitespace-nowrap`}>{role}</span>
        </div>
        <div className="p-2 relative h-64 flex-grow">
            <Line data={data} options={options} />
        </div>
        <div className="p-3 bg-gray-50 text-xs grid grid-cols-3 gap-1 text-center border-t">
            {stats.map((s, i) => (
                <div key={i}>
                    <span className="text-gray-400 block">{s.label}</span>
                    <span className={`font-bold ${s.valColor} text-sm`}>{s.value}</span>
                </div>
            ))}
        </div>
    </div>
);

export default OptionStrategyChart;
