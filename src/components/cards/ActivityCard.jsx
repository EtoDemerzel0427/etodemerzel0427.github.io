import React from 'react';
import { ArrowUpRight, Sprout } from 'lucide-react';
import { getCardStyle } from '../../utils/theme';

const Github = ({ size = 24, className, ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
    >
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
        <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
);

const ActivityCard = ({ universe, data, loading, className }) => {
    // data = { profile: ..., contributions: ..., fallbackUrl: ... }
    const { profile, contributions } = data || {};

    const handleClick = () => window.open(profile?.htmlUrl || data.fallbackUrl || 'https://github.com', '_blank');

    return (
        <div className={`${getCardStyle(universe, 'white', className)} group cursor-pointer overflow-hidden`} onClick={handleClick}>

            {/* Header: Icon + Arrow */}
            <div className="flex justify-between items-start mb-2 relative z-10">
                <div className="p-2 bg-black rounded-full text-white">
                    <Github size={18} />
                </div>
                <ArrowUpRight size={18} className="opacity-40 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </div>

            {/* Content Container */}
            <div className="flex flex-col h-full justify-between relative z-10 pb-2">

                {/* Stats Row: Repos & Followers (Always Available from User API) */}
                <div className="flex justify-between items-end mb-2">
                    <div>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-xl font-black ${universe === 'punk' ? 'text-[#00BBF9]' : 'text-gray-900'}`}>
                                {loading || !profile ? '-' : profile.publicRepos}
                            </span>
                            <span className="text-[9px] font-bold uppercase tracking-wider opacity-50">Repos</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className={`text-xs font-bold opacity-70`}>
                                {loading || !profile ? '-' : profile.followers}
                            </span>
                            <span className="text-[8px] font-bold uppercase tracking-wider opacity-40">Followers</span>
                        </div>
                    </div>
                </div>

                {/* Graph or Fallback Message */}
                {contributions && contributions.last28Days.length > 0 ? (
                    <div className="space-y-2 mt-auto">
                        <div className="flex justify-between items-baseline text-[9px] opacity-60 font-mono border-b border-black/5 pb-1 mb-2">
                            <span className="font-bold">Last 28 Days</span>
                            <span>{contributions.total} / yr</span>
                        </div>
                        <div className="grid grid-cols-7 gap-1.5 w-fit">
                            {contributions.last28Days.map((day, i) => (
                                <div key={i}
                                    className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-[1px] 
                          ${day.count === 0 ? 'bg-gray-100 dark:bg-white/5' :
                                            day.count < 3 ? 'bg-[#9be9a8]' :
                                                day.count < 6 ? 'bg-[#30a14e]' : 'bg-[#216e39]'}
                       `}
                                    title={`${day.date}: ${day.count} contributions`}
                                />
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="mt-2 text-[10px] opacity-50 font-mono text-center bg-gray-50 rounded py-2">
                        {loading ? 'Loading Stats...' : 'No public activity'}
                    </div>
                )}
            </div>

            {/* GitHub Decor Background Character */}
            <div className="absolute -bottom-4 -right-4 text-black/5 rotate-12 z-0">
                <Github size={80} />
            </div>

        </div>
    );
};

export default ActivityCard;
