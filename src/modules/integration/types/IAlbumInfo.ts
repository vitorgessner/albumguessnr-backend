import { IMBAlbum } from '../providers/interfaces/musicBrainzInterfaces';

export interface IMBAlbumResponse {
    'release-groups': Array<IMBAlbum>;
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
