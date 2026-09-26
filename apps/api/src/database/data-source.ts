import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PlatformConnection } from './entities/platform-connection.entity';
import { StreamProfile } from './entities/stream-profile.entity';
import { CreatePlatformTables1710000000000 } from './migrations/1710000000000-CreatePlatformTables';
import { CreateBetterAuthTables1710000001000 } from './migrations/1710000001000-CreateBetterAuthTables';

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  synchronize: false,
  logging: false,
  entities: [PlatformConnection, StreamProfile],
  migrations: [CreatePlatformTables1710000000000, CreateBetterAuthTables1710000001000],
  migrationsRun: false,
});
