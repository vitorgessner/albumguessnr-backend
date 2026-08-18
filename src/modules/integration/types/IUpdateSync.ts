import { SyncStatus } from '../../../generated/prisma/enums';

export interface IUpdateSync {
    syncCursor: number;
    lastSyncedAt: Date | null;
    syncStatus: SyncStatus;
    syncingTimestamp: Date | null;
    hadFailuresInChain: boolean;
}
