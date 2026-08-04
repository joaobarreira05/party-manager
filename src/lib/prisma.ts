import { PrismaClient } from '@prisma/client'
import { PrismaLibSql } from '@prisma/adapter-libsql'

const prismaClientSingleton = () => {
  // In production, use Turso (libSQL cloud) with auth token
  // In development, use local SQLite file
  const url = process.env.DATABASE_URL || "file:./dev.db"
  const authToken = process.env.TURSO_AUTH_TOKEN

  const adapter = new PrismaLibSql({
    url,
    ...(authToken ? { authToken } : {}),
  })
  return new PrismaClient({ adapter })
}

declare const globalThis: {
  prismaGlobal: ReturnType<typeof prismaClientSingleton>;
} & typeof global;

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

export default prisma

if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
