export interface GuessRow {
    album: AlbumCandidate;
    year: { value: string | null; status: CellStatus; direction: Direction };
    artists: { status: CellStatus };
    genres: { status: CellStatus; values: string[] };
    rymRating: { status: CellStatus; direction: Direction };
    rymRanking: { status: CellStatus; direction: Direction };
    descriptors: { status: CellStatus; values: string[] };
}

export type Direction = 'up' | 'down' | null;

export interface DailyAlbum {
    date: string;
    albumId: string;
    lastfmListeners: string | null;
    lastfmPlaycount: string | null;
    album: {
        id: string;
        name: string;
        mbid: string | null;
        normalizedName: string;
        normalizedArtist: string;
        year: string | null;
        rymRating: number | null;
        rymRanking: number | null;
        descriptors: string[];
        artists: {
            artist: {
                mbid: string | null;
                id: string;
                name: string;
                normalizedName: string;
            };
        }[];
        genres: {
            genre: {
                id: string;
                name: string;
            };
        }[];
    };
}

export interface AlbumCandidate {
    id: string;
    mbid: string | null;
    name: string;
    normalizedName: string;
    normalizedArtist: string;
    year: string | null;
    rymRating: number | null;
    rymRanking: number | null;
    descriptors: string[];
    artists: {
        artist: {
            mbid: string | null;
            id: string;
            name: string;
            normalizedName: string;
        };
    }[];
    genres: {
        genre: {
            id: string;
            name: string;
        };
    }[];
}

export type CellStatus = 'correct' | 'partial' | 'wrong';

export type CellShareStatus = 'correct' | 'partial' | 'wrong' | 'up' | 'down';
