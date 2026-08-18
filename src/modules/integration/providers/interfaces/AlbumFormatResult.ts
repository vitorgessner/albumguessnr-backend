import { INormalizedAlbum } from '../../../album/types/album';

export type AlbumFormatResult =
    | { status: 'to create'; album: INormalizedAlbum }
    | {
          status: 'failed';
          rawAlbum: { name: string; mbid: string | null; artist: string; normalizedAlbum: string };
          error: unknown;
      }
    | { status: 'synced' };
