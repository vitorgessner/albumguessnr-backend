import PQueue from 'p-queue';

export const lastfmQueue = new PQueue({ interval: 1200, intervalCap: 1 });

export const spotifyQueue = new PQueue({ interval: 800, intervalCap: 1 });

export const musicBrainzQueue = new PQueue({ interval: 1500, intervalCap: 1 });
