export const findLatestLibraryItem = (items, { type, status, fallback }) => {
    for (let index = items.length - 1; index >= 0; index -= 1) {
        const item = items[index];
        if (item.type === type && item.status === status) return item;
    }

    return fallback;
};

export const findLibraryItemById = (items, id, fallback) => (
    items.find((item) => item.id === id) || fallback
);

export const toReadingCardData = (item) => ({
    title: item.title,
    author: item.creator || item.author,
    cover: item.cover,
    progress: item.progress,
    status: 'Reading',
});

export const toGameCardData = (item) => ({
    title: item.title,
    platform: item.platform || 'PC',
    status: 'Now Playing',
    cover: item.cover,
});
