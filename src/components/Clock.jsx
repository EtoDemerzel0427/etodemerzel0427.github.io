import React, { useState, useEffect } from 'react';

const Clock = () => {
    const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', {
        timeZone: 'America/Chicago',
        hour: '2-digit',
        minute: '2-digit'
    }));

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(new Date().toLocaleTimeString('en-US', {
                timeZone: 'America/Chicago',
                hour: '2-digit',
                minute: '2-digit'
            }));
        }, 1000); // Poll every second, but state only updates when string changes (every minute)
        return () => clearInterval(timer);
    }, []);

    return <span className="font-mono text-sm opacity-60">{time}</span>;
};

export default Clock;
