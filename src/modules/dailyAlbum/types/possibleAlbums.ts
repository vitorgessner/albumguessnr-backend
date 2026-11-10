import { Decimal } from '@prisma/client/runtime/client';

export type PossibleAlbums = {
    count: number;
    genres: ({
        genre: {
            id: string;
            name: string;
        };
    } & {
        albumId: string;
        genreId: string;
    })[];
    artists: ({
        artist: {
            id: string;
            mbid: string | null;
            name: string;
            normalizedName: string;
        };
    } & {
        albumId: string;
        artistId: string;
    })[];
    id: string;
    mbid: string | null;
    name: string;
    normalizedName: string;
    normalizedArtist: string;
    year: string | null;
    rymRating: Decimal | null;
    rymRanking: Decimal | null;
    descriptors: string[];
};
