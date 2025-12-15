import React, { useState, useEffect } from 'react';

const Clock = () => {
    // Start with a consistent initial state to avoid hydration mismatch
    const [time, setTime] = useState(null);

    useEffect(() => {
        // Update time immediately on mount
        const updateTime = () => {
            setTime(new Date().toLocaleTimeString('en-US', {
                timeZone: 'America/Chicago',
                hour: '2-digit',
                minute: '2-digit'
            }));
        };

        updateTime();
        const timer = setInterval(updateTime, 1000);
        return () => clearInterval(timer);
    }, []);

    // Render a placeholder or nothing until client-side hydration is complete
    if (!time) return <span className="font-mono text-sm opacity-60">--:-- --</span>;

    return <span className="font-mono text-sm opacity-60">{time}</span>;
};

export default Clock;
