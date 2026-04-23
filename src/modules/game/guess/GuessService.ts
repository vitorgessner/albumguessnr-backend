import type GuessRepository from './GuessRepository.js';

class GuessService {
    private guessRepo: GuessRepository;
    constructor(guessRepo: GuessRepository) {
        this.guessRepo = guessRepo;
    }

    getTimesGuessed = async (userId: string, albumId: string) => {
        return await this.guessRepo.getTimesGuessed(userId, albumId);
    };

    guess = async (userId: string, albumId: string) => {
        const guess = await this.guessRepo.upsert(userId, albumId);

        return guess;
    };
}

export default GuessService;
