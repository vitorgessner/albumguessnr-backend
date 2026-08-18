export interface INormalizedAlbum {
    mbid: string | null;
    name: string;
    normalizedName: string;
    normalizedArtist: string;
    year: string | null;
    cover_url: string;
    genres: INormalizedTag[];
    artists: INormalizedArtist[];
    tracks: INormalizedTrack[];
    familiarityScore: number;
    playcount: number | null;
}

export interface ISavedAlbum {
    name: string;
    id: string;
    mbid: string | null;
    normalizedName: string;
    normalizedArtist: string;
    year: string | null;
    cover_url: string;
}

export interface INormalizedArtist {
    mbid: string | null;
    name: string;
    normalizedName: string;
}

export interface INormalizedTrack {
    name: string;
    normalizedName: string;
}

export interface INormalizedTag {
    name: string;
}
