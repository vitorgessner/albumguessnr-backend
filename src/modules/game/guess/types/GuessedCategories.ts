import { GuessedTrack } from './GuessedTrack';

export interface GuessedCategories {
    album: boolean;
    artist?: boolean;
    genre?: boolean;
    year?: boolean;
    tracklist?: GuessedTrack[];
}
