export interface IMBAlbumResponse {
    'release-groups': IMBAlbum[];
}

export interface IMBTrackResponse {
    media: {
        tracks: IMBTrack[];
    }[];
}

export interface IMBTrack {
    title: string;
    position: number;
    recording: {
        title: string;
        'first-release-date': string;
    };
}

export interface IMBAlbum {
    id: string;
    'type-id': string;
    score: number;
    'primary-type-id': string;
    'artist-credit-id': string;
    count: number;
    title: string;
    date: string;
    'first-release-date': string;
    'primary-type': string;
    'secondary-types': Array<string>;
    'secondary-types-ids': Array<string>;
    'release-group'?: {
        id: string;
        title: string;
        'primary-type': string;
    };
    media: {
        tracks: IMBTrack[];
    }[];
    'artist-credit': [
        {
            name: string;
            artist: {
                id: string;
                name: string;
                'sort-name': string;
                disambiguation: string;
                aliases: [
                    {
                        'sort-name': string;
                        'type-id': string;
                        name: string;
                        locale: string;
                        type: string;
                        primary: boolean;
                        'begin-date': string;
                        'end-date': string;
                    },
                ];
            };
        },
    ];
    releases: IMBAlbum[];
    tags: [
        {
            count: number;
            name: string;
        },
    ];
}
