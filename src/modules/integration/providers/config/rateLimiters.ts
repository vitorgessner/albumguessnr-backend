import PQueue from 'p-queue';

export const lastfmQueue = new PQueue({ interval: 1200, intervalCap: 1, concurrency: 1 });

export const musicBrainzQueue = new PQueue({ interval: 1200, intervalCap: 1, concurrency: 1 });

export const coverArtQueue = new PQueue({ concurrency: 3 });
