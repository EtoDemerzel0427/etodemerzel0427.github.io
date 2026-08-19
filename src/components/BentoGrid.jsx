import React from 'react';
import { useStore } from '@nanostores/react';
import { useUniverse } from '../hooks/useUniverse';
import { isPlaying as isPlayingStore, toggleMusic } from '../stores/musicStore';
import { USER_CONTENT, LAYOUT_CONFIG } from '../config';
import { useScores } from '../hooks/useScores';
import { useGitHubStats } from '../hooks/useGitHubStats';
import { CardRegistry } from '../components/CardRegistry';
import { libraryData } from '../data/library';
import { findLatestLibraryItem, toGameCardData, toReadingCardData } from '../utils/library';

const resolveCardData = (type, context) => {
    switch (type) {
        case 'music': return USER_CONTENT.nowPlaying;
        case 'archive': return { count: context.postCount, siteUrl: '/blog' };
        case 'tech': return context.latestPost || USER_CONTENT.featuredArticle;
        case 'reading': return toReadingCardData(context.latestBook);
        case 'score': return context.scores;
        case 'game': return toGameCardData(context.latestGame);
        case 'activity': return {
            profile: context.userProfile,
            contributions: context.contributionStats,
            fallbackUrl: `https://github.com/${USER_CONTENT.social.github}`,
        };
        case 'bio': return {
            projectUrl: `https://github.com/${USER_CONTENT.social.github}?tab=repositories`,
        };
        case 'wiki': return context.wiki;
        default: return {};
    }
};

const BentoGrid = ({ latestPost, postCount, latestGameData, latestBookData, wikiData }) => {
    // Global State via Nano Stores
    const universe = useUniverse();
    const isPlaying = useStore(isPlayingStore);

    // Data Hooks (Client-side fetching for other dynamic cards)
    const { scores, loading: scoresLoading } = useScores();
    const { userProfile, contributionStats, loading: githubLoading } = useGitHubStats(USER_CONTENT.social.github);

    // Derived State: Latest Playing Game
    // PREFER SERVER DATA (Optimized Cover) -> Fallback to Client Logic
    const latestGame = React.useMemo(() => {
        if (latestGameData) return latestGameData;
        return findLatestLibraryItem(libraryData, {
            type: 'game', status: 'playing', fallback: USER_CONTENT.game,
        });
    }, [latestGameData]);

    // Derived State: Latest Reading Book
    // PREFER SERVER DATA (Optimized Cover) -> Fallback to Client Logic
    const latestBook = latestBookData || USER_CONTENT.reading;

    // Wiki metadata is fetched from the notes site at build time; fall back to the static snapshot.
    const wiki = wikiData || USER_CONTENT.wiki;

    const cardContext = {
        contributionStats,
        latestBook,
        latestGame,
        latestPost,
        postCount,
        scores,
        userProfile,
        wiki,
    };

    return (
        <div className="max-w-7xl mx-auto relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[240px]">
                {LAYOUT_CONFIG.map((cardConfig) => {
                    const Component = CardRegistry[cardConfig.type];
                    if (!Component) return null;

                    const data = resolveCardData(cardConfig.type, cardContext);

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
        </div>
    );
};

export default BentoGrid;
