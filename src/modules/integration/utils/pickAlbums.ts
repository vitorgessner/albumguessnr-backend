import { Band, DIFFICULTY_BANDS } from './config/difficultyBands';

const shuffle = (arr: string[], rng = Math.random): string[] => {
    const albumIds = [...arr];
    for (let i = albumIds.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        const current = albumIds[i];
        const target = albumIds[j];
        if (current !== undefined && target !== undefined) {
            albumIds[j] = current;
            albumIds[i] = target;
        }
    }
    return albumIds;
};

const allocate = (total: number, bands: Band[]): number[] => {
    const sum = bands.reduce((acc, cur) => acc + cur.weight, 0);
    const raw = bands.map((band) => (band.weight / sum) * total);
    const counts = raw.map(Math.floor);
    const left = total - counts.reduce((a, b) => a + b, 0);
    raw.map((r, i) => ({ i, frac: r - Math.floor(r) }))
        .sort((a, b) => b.frac - a.frac)
        .slice(0, left)
        .forEach(({ i }) => {
            if (counts[i]) {
                counts[i]++;
            }
        });
    return counts;
};

export const pickAlbumIds = (
    items: { albumId: string; familiarityScore: number }[],
    total: number,
    bands = DIFFICULTY_BANDS,
    rng = Math.random
): string[] => {
    const pools = bands.map(() => [] as string[]);
    for (const item of items) {
        const index = bands.findIndex((band) => item.familiarityScore >= band.min);
        pools[index === -1 ? bands.length - 1 : index]?.push(item.albumId);
    }

    const targets = allocate(Math.min(total, items.length), bands);
    const picked: string[] = [];

    pools.forEach((pool, i) => {
        const shuffled = shuffle(pool, rng);
        picked.push(...shuffled.slice(0, targets[i]));
        pools[i] = shuffled.slice(targets[i]);
    });

    const missing = Math.min(total, items.length) - picked.length;
    if (missing > 0) picked.push(...shuffle(pools.flat(), rng).slice(0, missing));

    return shuffle(picked, rng);
};
