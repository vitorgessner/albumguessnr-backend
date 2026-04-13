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
