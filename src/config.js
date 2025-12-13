// --- 🔧 用户配置区域 (修改这里即可更新主页内容) ---
export const USER_CONTENT = {
    name: "Weiran Huang",
    role: "C++ Engineer",
    company: "Akuna Capital",
    bio: "Digital Artist, Pianist & Console Gamer.",
    location: "CHICAGO",
    status: {
        emoji: "🌴",
        text: "Vacationing in Cali" // 修改这里更新状态
    },
    nowPlaying: {
        song: "Pink + White",
        artist: "Frank Ocean"
    },
    featuredArticle: {
        date: "2024.03.15",
        category: "Engineering",
        title: "Modern C++: Understanding Memory Order",
        desc: "Exploring std::memory_order_relaxed vs acquire/release semantics in lock-free queues. Why 'volatile' is not enough."
    },

    social: {
        twitter: "@weiran_dev",
        github: "https://github.com/EtoDemerzel0427"
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
    github: {
        username: "EtoDemerzel0427"
    },
    // New Config for Blog & Music
    blogRepo: {
        username: "EtoDemerzel0427",
        repo: "notes",
        rawBaseUrl: "https://raw.githubusercontent.com/EtoDemerzel0427/notes/main/",
        siteUrl: "https://huangweiran.club/notes/",
        featuredPostPath: "content/Travel/Hawaii/欧胡百科.md"
    },
    musicUrl: "/music/Frank Ocean - Pink + White.mp3" // Local MP3
};
