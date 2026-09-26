export type Environment = {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
};

export function validateEnvironment(values: Record<string, unknown>): Environment {
  const nodeEnv = String(values.NODE_ENV ?? 'development');
  if (!['development', 'test', 'production'].includes(nodeEnv)) {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const port = Number(values.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be a valid TCP port');
  }

  const databaseUrl = String(values.DATABASE_URL ?? '');
  if (!databaseUrl.startsWith('postgres://') && !databaseUrl.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL must be a PostgreSQL connection URL');
  }

  return {
    NODE_ENV: nodeEnv as Environment['NODE_ENV'],
    PORT: port,
    DATABASE_URL: databaseUrl,
  };
}
