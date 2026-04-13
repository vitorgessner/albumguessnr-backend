import { prisma } from '../../config/prisma.js';
import type {
    AlbumCreateInput,
    ArtistCreateInput,
    GenreCreateInput,
    TrackCreateWithoutAlbumInput,
} from '../../generated/prisma/models.js';

type AlbumCreateInputWithoutMbid = Omit<AlbumCreateInput, 'mbid'> & {
    mbid: string | null;
};

type ArtistCreateInputWithoutMbid = Omit<ArtistCreateInput, 'mbid'> & {
    mbid: string | null;
};

class AlbumRepository {
    create = async (
        data: AlbumCreateInputWithoutMbid,
        genres: Array<GenreCreateInput>,
        artists: Array<ArtistCreateInputWithoutMbid>,
        tracks: Array<TrackCreateWithoutAlbumInput>
    ) => {
        return await prisma.album.upsert({
            where: {
                normalizedName_normalizedArtist: {
                    normalizedName: data.normalizedName,
                    normalizedArtist: data.normalizedArtist,
                },
            },
            create: {
                mbid: data.mbid,
                name: data.name,
                normalizedName: data.normalizedName,
                normalizedArtist: data.normalizedArtist,
                year: data.year ?? null,
                cover_url: data.cover_url,
                genres: {
                    create: genres.map((g) => ({
                        genre: {
                            connectOrCreate: {
                                where: { name: g.name },
                                create: { name: g.name },
                            },
                        },
                    })),
                },
                artists: {
                    create: artists.map((a) => ({
                        artist: {
                            connectOrCreate: {
                                where: { normalizedName: a.normalizedName },
                                create: {
                                    name: a.name,
                                    normalizedName: a.normalizedName,
                                    mbid: a.mbid,
                                },
                            },
                        },
                    })),
                },
                tracks: {
                    create: tracks.map((t) => ({
                        name: t.name,
                        normalizedName: t.normalizedName,
                    })),
                },
            },
            include: {
                genres: { include: { genre: true } },
                artists: { include: { artist: true } },
                tracks: { include: { album: true } },
            },
            update: {
                mbid: data.mbid,
                name: data.name,
                normalizedName: data.normalizedName,
                normalizedArtist: data.normalizedArtist,
                year: data.year ?? null,
                cover_url: data.cover_url,
            },
        });
    };
}

export default AlbumRepository;
