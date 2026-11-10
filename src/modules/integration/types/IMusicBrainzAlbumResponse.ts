import { INormalizedTag } from '../../album/types/album';
import { IMBAlbum } from '../providers/interfaces/musicBrainzInterfaces';

export type IMusicBrainzAlbumResponse =
    | {
          musicBrainzAlbum: IMBAlbum;
          tracks: { name: string; normalizedName: string }[] | null;
          genres: INormalizedTag[] | null;
          year: string | undefined;
      }
    | Error;
