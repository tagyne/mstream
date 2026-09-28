import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

const databaseUrl = process.env.DATABASE_URL ?? '';

const AppDataSource = new DataSource({
  type: 'postgres',
  url: databaseUrl,
  synchronize: false,
  logging: false,
  entities: [join(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations/*.{ts,js}')],
  migrationsRun: false,
});

export default AppDataSource;
