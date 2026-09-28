import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import AppDataSource from './data-source';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        AppDataSource.setOptions({ url: config.getOrThrow<string>('DATABASE_URL') });
        return AppDataSource.options;
      },
      dataSourceFactory: async () => AppDataSource,
    }),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}
