import { prisma } from '../config/prisma';
import { Prisma } from '../generated/prisma/client';

class TransactionRepository {
    transaction = async (fn: (tx: Prisma.TransactionClient) => Promise<void>) => {
        await prisma.$transaction(fn);
    };
}

export default TransactionRepository;
