export interface IAlbumInfo {
    artist: string;
    tags: {
        tag: [
            {
                url: string;
                name: string;
            },
        ];
    };
    name: string;
    userplaycount: number;
    image: [
        {
            size: string;
            '#text': string;
        },
    ];
    tracks: {
        track: [
            {
                duration: string;
                url: string;
                name: string;
                '@attr': {
                    rank: number;
                };
                artist: {
                    url: string;
                    name: string;
                    mbid: string;
                };
            },
        ];
    };
    url: string;
    playcount: string;
    listeners: string;
    wiki: {
        published: string;
        summary: string;
        content: string;
    };
}

export interface IMBAlbumResponse {
    'release-groups': Array<IMBAlbum>;
}

export interface IMBAlbum {
    id: string;
    'type-id': string;
    score: number;
    'primary-type-id': string;
    'artist-credit-id': string;
    count: number;
    title: string;
    'first-release-date': string;
    'primary-type': string;
    'secondary-types': Array<string>;
    'secondary-types-ids': Array<string>;
    'artist-credit': [
        {
            name: string;
            artist: {
                id: string;
                name: string;
                'sort-name': string;
                disambiguation: string;
                alisases: [
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
    releases: [
        {
            id: string;
            'status-id': string;
            title: string;
            status: string;
        },
    ];
    tags: [
        {
            count: number;
            name: string;
        },
    ];
}

export interface IMBAlbumWithTracks {
    'status-id': string;
    status: string;
    media: [
        {
            format: string;
            'format-id': string;
            title: string;
            id: string;
            'track-offset': number;
            tracks: Array<IMBTrack>;
        },
    ];
}

export interface IMBTrack {
    position: number;
    recording: {
        'first-release-date': string;
        video: boolean;
        length: number;
        disambiguation: string;
        title: string;
        id: string;
    };
    length: number;
    id: string;
    title: string;
    number: string;
}
