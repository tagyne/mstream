import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StreamProfile } from './stream-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([StreamProfile])],
  exports: [TypeOrmModule],
})
export class StreamProfileModule {}
