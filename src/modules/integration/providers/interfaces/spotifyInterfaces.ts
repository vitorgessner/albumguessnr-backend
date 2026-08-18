export interface ITopTracksResponse {
    offset: number;
    total: number;
    items: {
        album: ISpotifyTopTrack;
    }[];
}

export interface ISpotifyTopTrack {
    album_type: string;
    images: {
        url: string;
    }[];
    name: string;
    id: string;
    release_date: Date;
    artists: {
        name: string;
    }[];
}

export interface IAlbumTracksResponse {
    items: {
        name: string;
    }[];
}
