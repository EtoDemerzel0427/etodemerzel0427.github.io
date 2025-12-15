// --- 🔧 用户配置区域 (修改这里即可更新主页内容) ---
export const USER_CONTENT = {
    name: "Weiran Huang",
    role: "C++ Software Engineer",
    bio: "Amateur Digital Artist, Pianist & Console Gamer.",
    location: "CHICAGO",
    status: {
        emoji: "🌴",
        text: "Vacationing in Cali",
        // Extended "Polaroid Moment" content
        meta: {
            photoUrl: "https://images.unsplash.com/photo-1538332576228-eb5b4c4de6f5?q=80&w=3570&auto=format&fit=crop", // Malibu Beach
            note: "The sunsets here are unreal. Coding by the beach beats the office any day. 🌊",
            date: "2025.12.12",
            location: "Malibu, CA"
        }
    },
    defaultTheme: 'bauhaus', // Default universe on load
    nowPlaying: {
        song: "Pink + White",
        artist: "Frank Ocean",
        audioUrl: "/music/Frank Ocean - Pink + White.mp3" // Local MP3 or URL
    },
    featuredArticle: {
        // Fallback content if GitHub API fails to fetch the featured post
        date: "2024.03.15",
        category: "Engineering",
        title: "Modern C++: Understanding Memory Order",
        desc: "Exploring std::memory_order_relaxed vs acquire/release semantics in lock-free queues. Why 'volatile' is not enough.",
        url: "https://huangweiran.club/notes/#oahu-travel-wiki"
    },

    social: {
        linkedin: "weiranhuang",
        github: "EtoDemerzel0427",
        email: "huangweiran1998@outlook.com"
    },
    game: {
        title: "EA SPORTS FC 25",
        platform: "PS5",
        status: "Now Playing",
        cover: "https://external-preview.redd.it/no-new-mls-stadiums-in-eafc-25-fifa-for-the-2nd-year-in-a-v0-siI7JlZbMpFK-YkWObnGvmV1KAi7Hzffl7wLqelaT94.jpg?auto=webp&s=909e8c1eff86cf42418e1ddb0f69d4c2986df4a8", // User Provided Reddit Image
        link: "https://www.ea.com/games/ea-sports-fc/fc-25",
    },
    reading: {
        title: "Options, Futures, and Other Derivatives",
        author: "John C. Hull",
        cover: "https://pubengine.s3.eu-central-1.amazonaws.com/cover/99.150005/9781292410623.jpg", // 11th Edition (Reliable Source)
        link: "https://www.goodreads.com/book/show/100827.Options_Futures_and_Other_Derivatives",
        progress: 10,
        status: "Reading" // or "Finished", "To Read"
    },
    blogRepo: {
        username: "EtoDemerzel0427",
        repo: "notes",
        rawBaseUrl: "https://raw.githubusercontent.com/EtoDemerzel0427/notes/main/",
        siteBaseUrl: "https://huangweiran.club/notes/", // Base URL for constructing deep links
        featuredPostPath: "content/Travel/Hawaii/欧胡百科.md"
    },
    // Giscus removed.
    disqus: {
        shortname: "weiran-verse", // Placeholder: User needs to register on Disqus and replace this!
    },
    googleAnalytics: {
        id: "G-GFJLECR3EB"
    }
};

export const LAYOUT_CONFIG = [
    { id: 'bio', type: 'bio', colSpan: 1, rowSpan: 2, className: 'sm:col-span-2 md:col-span-2' },
    { id: 'music', type: 'music', colSpan: 1, rowSpan: 1 },
    { id: 'archive', type: 'archive', colSpan: 1, rowSpan: 1 },
    { id: 'tech', type: 'tech', colSpan: 1, rowSpan: 1, className: 'md:col-span-2' },
    { id: 'reading', type: 'reading', colSpan: 1, rowSpan: 2 },
    { id: 'score', type: 'score', colSpan: 1, rowSpan: 1 },
    { id: 'quote', type: 'quote', colSpan: 1, rowSpan: 1 },
    { id: 'game', type: 'game', colSpan: 1, rowSpan: 1, className: 'md:col-span-2' },
    { id: 'activity', type: 'activity', colSpan: 1, rowSpan: 1 },
];
