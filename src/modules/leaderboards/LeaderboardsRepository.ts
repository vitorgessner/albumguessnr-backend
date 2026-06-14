import { prisma } from '../../config/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';

export type CategoriesWithoutTracks = 'ALBUM' | 'ARTIST' | 'GENRE' | 'YEAR';
export type Categories = 'TRACKLIST' | CategoriesWithoutTracks;

type PossibleReturns = {
    userId: string;
    username: string;
    displayUsername: string;
    category: CategoriesWithoutTracks;
    accuracy: bigint;
    rows: bigint;
    totalScore: bigint;
};
type ScoreReturn = Omit<PossibleReturns, 'accuracy' | 'category'>;
type AccuracyReturn = Omit<PossibleReturns, 'totalScore'>;

class LeaderboardsRepository {
    constructor() {}
    getLeaderboard = async (page: number, startDate?: Date, finalDate?: Date, userId?: string) => {
        const friendsSqlFragment = await this.getFriendsSqlFragment(userId);
        const periodSqlFragment = await this.getPeriodSqlFragment(startDate, finalDate);

        const leaderboard = await prisma.$queryRaw<ScoreReturn[]>`
        WITH "bestScoreByAlbum" AS (
            SELECT "userId", "albumId", MAX("totalScore") as "maxScore" FROM "GuessAttempt"
            ${friendsSqlFragment} AND ${periodSqlFragment}
            GROUP BY "userId", "albumId"
        ),

        "SumOfEachBestScoreByAlbum" AS (
            SELECT "userId", SUM("maxScore") AS "totalScore" FROM "bestScoreByAlbum"
            GROUP BY "userId"
        )

        SELECT t."userId", "username", "displayUsername", "avatar_url", "totalScore", 
        COUNT(*) OVER() AS "rows" 
        FROM "SumOfEachBestScoreByAlbum" AS t
        JOIN "Profile" AS p
        ON t."userId" = p."userId"
        ORDER BY "totalScore" DESC
        LIMIT 50
        OFFSET ${(page ?? 0) * 50}
        `;

        return leaderboard;
    };

    getCategoryLeaderboard = async (
        category: string,
        page: number,
        startDate?: Date,
        finalDate?: Date,
        userId?: string
    ) => {
        const friendsSqlFragment = await this.getFriendsSqlFragment(userId);
        const categorySqlFragment = await this.getCategorySqlFragment(category);
        const periodSqlFragment = await this.getPeriodSqlFragment(startDate, finalDate);

        const totalSum = await prisma.$queryRaw<ScoreReturn[]>`
        WITH "SumOfEachBestScoreByCategory" AS (
            SELECT "userId", "gameMode", SUM("bestScore") as "totalScore" FROM "UserAlbumScores"
            ${friendsSqlFragment} AND ${categorySqlFragment} AND ${periodSqlFragment}
            GROUP BY "userId", "gameMode"
        )

        SELECT c."userId", "username", "displayUsername" "avatar_url", "totalScore", 
        COUNT(*) OVER() AS "rows" 
        FROM "SumOfEachBestScoreByCategory" AS c
        JOIN "Profile" AS p
        ON c."userId" = p."userId"
        ORDER BY "totalScore" DESC
        LIMIT 50
        OFFSET ${(page ?? 0) * 50}
        `;

        return totalSum;
    };

    getCategoryAccuracyLeaderboard = async (
        category: CategoriesWithoutTracks,
        page: number,
        startDate?: Date,
        finalDate?: Date,
        userId?: string
    ) => {
        const friendsSqlFragment = await this.getFriendsSqlFragment(userId);
        const periodSqlFragment = await this.getPeriodSqlFragment(startDate, finalDate);

        const accuracyLeaderboard = await prisma.$queryRaw<AccuracyReturn[]>`
            WITH "correctlyGuessedTimes" AS (
                SELECT "userId", "category", COUNT(*) AS "rightGuessedCount"
                FROM "GuessAttemptCategory" AS gc
                JOIN "GuessAttempt" as g ON g."id" = gc."guessAttemptId"
                ${friendsSqlFragment} AND "score" > 0 AND "category" = ${category} 
                AND ${periodSqlFragment}
                GROUP BY "userId", "category"
            ),
            
            "accuracyByUser" AS (
                SELECT g."userId", gc."category", COUNT(gc.*) AS "totalCount"
                FROM "GuessAttemptCategory" AS gc 
                JOIN "GuessAttempt" as g
                ON g."id" = gc."guessAttemptId"
                WHERE gc."category" = ${category} AND ${periodSqlFragment}
                GROUP BY g."userId", gc."category"
            )

            SELECT au."userId", p."username", p."displayUsername", "avatar_url", au."category", 
            "rightGuessedCount" * 10000 / "totalCount" AS "accuracy", COUNT(au.*) AS "rows"
            FROM "accuracyByUser" AS au
            JOIN "correctlyGuessedTimes" AS cg 
            ON au."userId" = cg."userId"
            JOIN "Profile" AS p 
            ON au."userId" = p."userId"
            JOIN "UserStats" as us
            ON us."userId" = au."userId"
            GROUP BY au."userId", p."username", p."displayUsername", "avatar_url", au."category", 
            "accuracy", "totalScore"
            ORDER BY "accuracy" DESC, us."totalScore" DESC
            LIMIT 50 OFFSET ${(page ?? 0) * 50}
        `;

        return accuracyLeaderboard;
    };

    getTracklistAccuracyLeaderboard = async (
        page: number,
        startDate?: Date,
        finalDate?: Date,
        userId?: string
    ) => {
        const friendsSqlFragment = await this.getFriendsSqlFragment(userId);
        const periodSqlFragment = await this.getPeriodSqlFragment(startDate, finalDate);

        const accuracyLeaderboard = await prisma.$queryRaw<AccuracyReturn[]>`
            WITH "correctlyGuessedTimes" AS (
                SELECT g."userId", COUNT(*) AS "rightGuessedCount"
                FROM "GuessedTrack" AS gt
                JOIN "GuessAttempt" as g ON g."id" = gt."guessAttemptId"
                ${friendsSqlFragment} AND "isCorrect" = true AND ${periodSqlFragment}
                GROUP BY "userId"
            ),
            
            "totalGuessedTimes" AS (
                SELECT g."userId", COUNT(gt.*) AS "totalCount"
                FROM "GuessedTrack" AS gt 
                JOIN "GuessAttempt" as g
                ON g."id" = gt."guessAttemptId"
                WHERE ${periodSqlFragment}
                GROUP BY g."userId"
            )

            SELECT tg."userId", p."username", p."displayUsername", "avatar_url",
            "rightGuessedCount" * 10000 / "totalCount" AS "accuracy", COUNT(tg.*) AS "rows"
            FROM "totalGuessedTimes" AS tg
            JOIN "correctlyGuessedTimes" AS cg 
            ON tg."userId" = cg."userId"
            JOIN "Profile" AS p 
            ON tg."userId" = p."userId"
            JOIN "UserStats" AS us
            ON us."userId" = tg."userId"
            GROUP BY tg."userId", p."username", p."displayUsername", "avatar_url", "accuracy", 
            "totalScore"
            ORDER BY "accuracy" DESC, "totalScore" DESC
            LIMIT 50 OFFSET ${(page ?? 0) * 50}
        `;

        return accuracyLeaderboard;
    };

    private getFriendsIds = async (userId: string) => {
        const arr: string[] = [userId];
        await prisma.userFriends
            .findMany({
                where: {
                    stat: 'FRIEND',
                    receivedRequestsId: userId,
                },
                select: {
                    receivedRequestsId: true,
                    sentRequestsId: true,
                },
            })
            .then((res) =>
                res.forEach((r) => {
                    arr.push(r.sentRequestsId);
                })
            );

        return arr;
    };

    private getAccuracySqlFragment = async (category: Categories) => {
        const fields = {
            ALBUM: { right: '"rightGuessedAlbums"', total: '"guessedAlbums"' },
            ARTIST: { right: '"rightGuessedArtist"', total: '"guessedArtists"' },
            GENRE: { right: '"rightGuessedGenres"', total: '"guessedGenres"' },
            YEAR: { right: '"rightGuessedYears"', total: '"guessedYears"' },
            TRACKLIST: { right: '"rightGuessedTracks"', total: '"guessedTracks"' },
        };

        return Prisma.sql`
        ${Prisma.raw(fields[category].right)} * 10000 / 
        NULLIF(${Prisma.raw(fields[category].total)}, 0)
        `;
    };

    private getFriendsSqlFragment = async (userId: string | undefined) => {
        if (!userId) return Prisma.sql`WHERE true`;

        const friendsIds = await this.getFriendsIds(userId);
        return Prisma.sql`
                WHERE "userId" IN (${Prisma.join(friendsIds)})
        `;
    };

    private getPeriodSqlFragment = async (startDate?: Date, finalDate?: Date) => {
        if (!startDate || !finalDate) return Prisma.sql`true`;

        return Prisma.sql`
        "date" >= ${startDate} AND "date" < ${finalDate}
        `;
    };

    private getCategorySqlFragment = async (category?: string) => {
        if (!category) return Prisma.sql`true`;

        return Prisma.sql`
        "gameMode" = ${category}
        `;
    };
}

export default LeaderboardsRepository;
