export const config = (n: number) => {
    return {
        album: {
            basePoints: 10,
            expectedTime: 5,
        },
        artist: {
            basePoints: 7,
            expectedTime: 5,
        },
        genre: {
            basePoints: 4,
            expectedTime: 4,
        },
        year: {
            basePoints: 5,
            expectedTime: 3,
        },
        tracklist: {
            basePoints: 14 + n,
            expectedTime: n * 4,
        },
    };
};
