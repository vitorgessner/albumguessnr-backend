export interface IUserAlbum {
    artist: {
        url: string;
        name: string;
        mbid: string;
    };
    image: [
        {
            size: string;
            '#text': string;
        },
    ];
    mbid: string;
    url: string;
    playcount: string;
    year: Date;
    '@attr': {
        rank: string;
    };
    name: string;
    normalizedName: string;
}

export interface IUserAlbumWithInfo extends IUserAlbum {
    normalizedArtist: string;
    cover_url: string;
}
