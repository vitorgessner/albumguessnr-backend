export interface IMBAlbumResponse {
    'release-groups': IMBAlbum[];
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
