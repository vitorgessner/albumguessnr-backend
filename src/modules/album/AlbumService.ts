import DatabaseError from '../../shared/errors/DatabaseError';
import AlbumRepository from './AlbumRepository';

export class AlbumService {
    constructor(private albumRepo: AlbumRepository) {}

    getAlbum = async (albumId: string) => {
        const album = await this.albumRepo.get(albumId);
        if (!album) {
            throw new DatabaseError(404, `Album with id "${albumId}" was not found`);
        }

        return album;
    };
}
