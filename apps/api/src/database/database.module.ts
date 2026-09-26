import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformConnection } from './entities/platform-connection.entity';
import { StreamProfile } from './entities/stream-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        synchronize: false,
        autoLoadEntities: true,
        migrationsRun: false,
      }),
    }),
    TypeOrmModule.forFeature([PlatformConnection, StreamProfile]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
