import { useState, useEffect } from 'react';

export const useScores = () => {
    const [scores, setScores] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch('/scores.json')
            .then(res => {
                if (!res.ok) throw new Error('Scores not found');
                return res.json();
            })
            .then(data => {
                setScores(data);
                setLoading(false);
            })
            .catch(err => {
                console.warn("Could not fetch scores (probably running locally without fetch script):", err);
                setError(err);
                setLoading(false);
            });
    }, []);

    return { scores, loading, error };
};
