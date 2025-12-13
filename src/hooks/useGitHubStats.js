import { useState, useEffect } from 'react';

/**
 * Hook to fetch GitHub contribution stats
 * Uses https://github-contributions-api.jogruber.de/ (Unofficial but reliable)
 * Fallback to basic API if needed.
 */
export const useGitHubStats = (username) => {
    const [stats, setStats] = useState({
        userProfile: null,
        contributionStats: null,
        loading: true,
        error: null
    });

    useEffect(() => {
        if (!username) return;

        const fetchData = async () => {
            try {
                // Parallel Fetch: 
                // 1. Official GitHub User API (for public repos, followers)
                // 2. Unofficial Contribution API (for the graph)
                const [userRes, statsRes] = await Promise.all([
                    fetch(`https://api.github.com/users/${username}`),
                    fetch(`https://github-contributions-api.jogruber.de/v4/${username}?y=last`)
                ]);

                if (!userRes.ok) throw new Error('Failed to fetch user profile');
                // statsRes might fail (500/rate limit), we can tolerate that if userRes succeeds

                const userData = await userRes.json();
                let statsData = null;

                if (statsRes.ok) {
                    const json = await statsRes.json();

                    // Total for current year
                    const currentYear = new Date().getFullYear();
                    const total = json.total[currentYear] || 0;

                    // Last 28 days
                    const last28Days = json.contributions.slice(-28).map(day => ({
                        date: day.date,
                        count: day.count,
                        level: day.level
                    }));

                    statsData = { total, last28Days };
                }

                setStats({
                    userProfile: {
                        publicRepos: userData.public_repos,
                        followers: userData.followers,
                        avatarUrl: userData.avatar_url,
                        htmlUrl: userData.html_url
                    },
                    contributionStats: statsData || { total: 0, last28Days: [] },
                    loading: false,
                    error: null
                });

            } catch (err) {
                console.error("GitHub Data Error:", err);
                setStats(prev => ({ ...prev, loading: false, error: err.message }));
            }
        };

        fetchData();
    }, [username]);

    return stats;
};
