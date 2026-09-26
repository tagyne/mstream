import { Column, Entity, PrimaryGeneratedColumn, Unique } from 'typeorm';

@Entity({ name: 'stream_profiles' })
@Unique('uq_stream_profiles_user_platform', ['userId', 'platform'])
export class StreamProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId!: string;

  @Column({ type: 'varchar', length: 32 })
  platform!: 'twitch' | 'kick';

  @Column({ name: 'external_channel_id', type: 'varchar', length: 255 })
  externalChannelId!: string;

  @Column({ type: 'text', nullable: true })
  title!: string | null;

  @Column({ name: 'category_id', type: 'varchar', length: 255, nullable: true })
  categoryId!: string | null;
}
