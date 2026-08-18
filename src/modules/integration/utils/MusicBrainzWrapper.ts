import { getApiInstances } from '../providers/config/axiosInstances';
import { IMBAlbum, IMBAlbumResponse } from '../providers/interfaces/musicBrainzInterfaces';
import { normalizeAlbumName, normalizeArtistName } from './normalize';

export class MusicBrainzWrapper {
    private musicBrainzAxios;
    constructor() {
        this.musicBrainzAxios = getApiInstances().musicBrainzAxios;
    }

    fetchAlbum = async (name: string, artist?: string): Promise<IMBAlbum | undefined> => {
        const formattedArtist = normalizeArtistName(artist ?? '');

        const response = await this.musicBrainzAxios.get<IMBAlbumResponse>('', {
            params: {
                query: `album:${normalizeAlbumName(name)} AND 
                            artist:${formattedArtist} AND 
                            (primarytype:album OR primarytype:ep)`,
            },
        });

        return response.data['release-groups'][0];
    };
}
