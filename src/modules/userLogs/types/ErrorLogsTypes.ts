import { UserAlbumDataErrorsLogsCreateInput } from '../../../generated/prisma/models';
import { Album } from './AlbumDataTypes';

export type UserAlbumDataErrorsLogsWithUserId = Omit<UserAlbumDataErrorsLogsCreateInput, 'user'> & {
    userId: string;
};

export interface UserAlbumErrorLogData {
    userId: string;
    album: Album;
    fieldsWithErrors: string;
    description: string;
}
