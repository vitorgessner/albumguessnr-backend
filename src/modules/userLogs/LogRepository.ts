import { prisma } from '../../config/prisma';
import { UserAlbumDataErrorsLogsWithUserId } from './types/ErrorLogsTypes';

export class LogRepository {
    saveUserAlbumErrorLog = async (data: UserAlbumDataErrorsLogsWithUserId) => {
        return await prisma.userAlbumDataErrorsLogs.create({
            data: {
                albumId: data.albumId,
                albumName: data.albumName,
                artist: data.artist,
                description: data.description,
                fieldsWithErrors: data.fieldsWithErrors,
                normalizedAlbum: data.normalizedAlbum,
                mbid: data.mbid ?? null,
                userId: data.userId,
                status: 'PENDING',
            },
        });
    };
}
