import React from 'react';
import { useStore } from '@nanostores/react';
import { universe as universeStore } from '../stores/universeStore';
import { isPlaying as isPlayingStore, toggleMusic } from '../stores/musicStore';
import { USER_CONTENT, LAYOUT_CONFIG } from '../config';
import { useScores } from '../hooks/useScores';
import { useGitHubStats } from '../hooks/useGitHubStats';
import { CardRegistry } from '../components/CardRegistry';
import { libraryData } from '../data/library';

const BentoGrid = ({ latestPost, postCount }) => {
    // Global State via Nano Stores
    const universe = useStore(universeStore);
    const isPlaying = useStore(isPlayingStore);

    // Data Hooks (Client-side fetching for other dynamic cards)
    const { scores, loading: scoresLoading } = useScores();
    const { userProfile, contributionStats, loading: githubLoading } = useGitHubStats(USER_CONTENT.social.github);

    // Derived State: Latest Playing Game
    // Find the last game in the library with status 'playing'
    const latestGame = React.useMemo(() => {
        const playingGames = libraryData.filter(item => item.type === 'game' && item.status === 'playing');
        return playingGames.length > 0 ? playingGames[playingGames.length - 1] : USER_CONTENT.game;
    }, []);

    return (
        <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[240px]">
                {LAYOUT_CONFIG.map((cardConfig) => {
                    const Component = CardRegistry[cardConfig.type];
                    if (!Component) return null;

                    // Resolve Data
                    let data = {};
                    if (cardConfig.type === 'music') data = USER_CONTENT.nowPlaying;
                    else if (cardConfig.type === 'archive') data = { count: postCount, siteUrl: '/blog' }; // Use prop
                    else if (cardConfig.type === 'tech') data = latestPost || USER_CONTENT.featuredArticle; // Use prop
                    else if (cardConfig.type === 'reading') data = USER_CONTENT.reading;
                    else if (cardConfig.type === 'score') data = scores;
                    else if (cardConfig.type === 'game') {
                        // Adapt library data format to GameCard format
                        const source = latestGame;
                        data = {
                            title: source.title,
                            platform: source.platform || 'PC', // Fallback
                            status: 'Now Playing', // Override status text for homepage card
                            cover: source.cover,
                            link: '/gallery?tab=game' // Internal link is handled by Card onClick, avoiding data.link usage
                        };
                    }
                    else if (cardConfig.type === 'activity') data = { profile: userProfile, contributions: contributionStats, fallbackUrl: `https://github.com/${USER_CONTENT.social.github}` };
                    else if (cardConfig.type === 'bio') data = { projectUrl: `https://github.com/${USER_CONTENT.social.github}?tab=repositories` };

                    // Resolve Special Props
                    const extraProps = {};
                    if (cardConfig.type === 'music') {
                        extraProps.isPlaying = isPlaying;
                        extraProps.onToggle = toggleMusic;
                    }
                    // Archive loading is no longer needed as it's SSR
                    if (cardConfig.type === 'score') extraProps.loading = scoresLoading;
                    if (cardConfig.type === 'activity') extraProps.loading = githubLoading;

                    return (
                        <Component
                            key={cardConfig.id}
                            universe={universe}
                            data={data}
                            className={cardConfig.className || ''}
                            {...extraProps}
                        />
                    );
                })}
            </div>
            {/* Styles for Music Bar Animation */}
            <style>{`
                 @keyframes music-bar {
                  0%, 100% { height: 40%; }
                  50% { height: 100%; }
                }
            `}</style>
        </div>
    );
};

export default BentoGrid;
