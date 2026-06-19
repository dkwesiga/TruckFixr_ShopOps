import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

type PrismaRoot = PrismaClient;

const globalForPrisma = globalThis as unknown as { prismaClient?: PrismaRoot };

function getAdapterConnectionString() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return connectionString;

  const url = new URL(connectionString);
  if (url.searchParams.get("sslmode") === "require" && !url.searchParams.has("uselibpqcompat")) {
    url.searchParams.set("uselibpqcompat", "true");
  }

  return url.toString();
}

function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: getAdapterConnectionString() }),
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

function getClient() {
  globalForPrisma.prismaClient ??= createPrismaClient();
  return globalForPrisma.prismaClient;
}

async function replaceClient() {
  if (globalForPrisma.prismaClient) {
    try {
      await globalForPrisma.prismaClient.$disconnect();
    } catch {
      // Best effort: a dead client may already be gone.
    }
  }

  const client = createPrismaClient();
  globalForPrisma.prismaClient = client;
  return client;
}

function isClosedConnectionError(error: unknown) {
  return error instanceof Error && error.message.includes("Server has closed the connection");
}

async function withReconnect<T>(operation: (client: PrismaRoot) => Promise<T>): Promise<T> {
  try {
    return await operation(getClient());
  } catch (error) {
    if (!isClosedConnectionError(error)) throw error;
    const client = await replaceClient();
    return operation(client);
  }
}

function wrapValue(getValue: (client: PrismaRoot) => unknown): unknown {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === Symbol.toStringTag) return "PrismaProxy";

        const sample = getValue(getClient()) as Record<PropertyKey, unknown> | undefined;
        const value = sample?.[prop];

        if (typeof value === "function") {
          if (prop === "$disconnect") {
            return async () => {
              if (!globalForPrisma.prismaClient) return;
              await globalForPrisma.prismaClient.$disconnect();
              globalForPrisma.prismaClient = undefined;
            };
          }

          return (...args: unknown[]) =>
            withReconnect(async (client) => {
              const target = getValue(client) as Record<PropertyKey, unknown>;
              const fn = target[prop];
              if (typeof fn !== "function") {
                throw new Error(`Prisma property ${String(prop)} is not callable.`);
              }
              return fn.apply(target, args);
            });
        }

        if (value && typeof value === "object") {
          return wrapValue((client) => {
            const target = getValue(client) as Record<PropertyKey, unknown>;
            return target[prop];
          });
        }

        return value;
      },
    }
  );
}

export const prisma = wrapValue((client) => client) as PrismaClient;
