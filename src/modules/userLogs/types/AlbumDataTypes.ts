export interface Artist {
    albumId: string;
    artistId: string;
    artist: {
        id: string;
        mbid: string;
        name: string;
        normalizedName: string;
    };
}

export interface Album {
    cover_url: string;
    id: string;
    mbid: string | null;
    name: string;
    normalizedArtist: string;
    normalizedName: string;
    artists: Array<Artist>;
    year: string;
}
