export interface ProfileDTO {
    userId: string;
    provider: string;
    providerAccountId: string;
    accessToken: string | null;
    refreshToken: string | null;
    expiresAt: Date | null;
    username: string;
    displayUsername: string;
    lastSyncedAt: Date | null;
    syncCursor: number;
    syncStatus: 'IDLE' | 'SYNCING' | 'SUCCESS' | 'SUCCEEDWITHFAILURE' | 'FAILED';
    syncingTimestamp: Date | null;
}
