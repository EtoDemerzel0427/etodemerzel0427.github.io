import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { USER_CONTENT, LAYOUT_CONFIG } from '../config';
import { useGitHubBlogs } from '../hooks/useGitHubBlogs';
import { useScores } from '../hooks/useScores';
import { useGitHubStats } from '../hooks/useGitHubStats';
import { CardRegistry } from '../components/CardRegistry';
import Header from '../components/Header';

const BentoGrid = React.memo(({ universe, blogCount, featuredPost, scores, userProfile, contributionStats, blogsLoading, scoresLoading, githubLoading, isPlaying, onToggleMusic }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 auto-rows-[200px] md:auto-rows-[240px]">
        {LAYOUT_CONFIG.map((cardConfig) => {
            const Component = CardRegistry[cardConfig.type];
            if (!Component) return null;

            // Resolve Data
            let data = {};
            if (cardConfig.type === 'music') data = USER_CONTENT.nowPlaying;
            else if (cardConfig.type === 'archive') data = { count: blogCount, siteUrl: '/blog' };
            else if (cardConfig.type === 'tech') data = featuredPost || USER_CONTENT.featuredArticle;
            else if (cardConfig.type === 'reading') data = USER_CONTENT.reading;
            else if (cardConfig.type === 'score') data = scores;
            else if (cardConfig.type === 'game') data = USER_CONTENT.game;
            else if (cardConfig.type === 'activity') data = { profile: userProfile, contributions: contributionStats, fallbackUrl: `https://github.com/${USER_CONTENT.social.github}` };
            else if (cardConfig.type === 'bio') data = { projectUrl: `https://github.com/${USER_CONTENT.social.github}?tab=repositories` };
            // Quote handles its own static data or don't need it prop-passed

            // Resolve Special Props
            const extraProps = {};
            if (cardConfig.type === 'music') {
                extraProps.isPlaying = isPlaying;
                extraProps.onToggle = onToggleMusic;
            }
            if (cardConfig.type === 'archive') extraProps.loading = blogsLoading;
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
));

const Home = () => {
    const { universe, handleShowStatus, isPlaying, toggleMusic } = useOutletContext();

    // Blog Hook
    const { count: blogCount, featuredPost, loading: blogsLoading } = useGitHubBlogs();
    // Score Hook
    const { scores, loading: scoresLoading } = useScores();
    // Fetch Real GitHub Stats
    const { userProfile, contributionStats, loading: githubLoading } = useGitHubStats(USER_CONTENT.social.github);

    return (
        <div className="max-w-7xl mx-auto relative z-10 pt-12">
            <Header universe={universe} onShowStatus={handleShowStatus} />

            <BentoGrid
                universe={universe}
                blogCount={blogCount}
                featuredPost={featuredPost}
                scores={scores}
                userProfile={userProfile}
                contributionStats={contributionStats}
                blogsLoading={blogsLoading}
                scoresLoading={scoresLoading}
                githubLoading={githubLoading}
                isPlaying={isPlaying}
                onToggleMusic={toggleMusic}
            />

            <style>{`
         @keyframes music-bar {
          0%, 100% { height: 40%; }
          50% { height: 100%; }
        }
      `}</style>
        </div>
    );
};

export default Home;
