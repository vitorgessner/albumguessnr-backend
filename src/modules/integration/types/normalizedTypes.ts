export interface INormalizedArtist {
    mbid: string;
    name: string;
    normalizedName: string;
}

export interface INormalizedTrack {
    name: string;
    normalizedName: string;
    duration: string;
    url: string;
    '@attr': {
        rank: number;
    };
    artist: {
        url: string;
        name: string;
        mbid: string;
    };
}
