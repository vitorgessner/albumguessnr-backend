import { LogRepository } from './LogRepository';
import { UserAlbumDataErrorsLogsWithUserId, UserAlbumErrorLogData } from './types/ErrorLogsTypes';

export class LogService {
    constructor(private logRepo: LogRepository) {}

    saveUserAlbumErrorLog = async (data: UserAlbumErrorLogData) => {
        const logErrorObject: UserAlbumDataErrorsLogsWithUserId = {
            ...data,
            albumId: data.album.id,
            mbid: data.album.mbid,
            albumName: data.album.name,
            artist: data.album.artists.map((a) => a.artist.name).join(', '),
            normalizedAlbum: data.album.normalizedName + ' by ' + data.album.normalizedArtist,
        };

        return await this.logRepo.saveUserAlbumErrorLog(logErrorObject);
    };
}
