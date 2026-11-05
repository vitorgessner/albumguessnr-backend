import { AlbumFormatResult } from '../providers/interfaces/AlbumFormatResult';
import { ProfileDTO } from './ProfileDTO';

export interface IProviderConnector {
    getProfile: () => ProfileDTO;
    getSyncingId: () => Promise<string | null | undefined>;
    getInitialCursor: () => number;
    fetchAlbums: (syncCursor?: number) => Promise<{
        albums: AlbumFormatResult[];
        hasNextPage: boolean;
        syncCursor: number;
    }>;
}
