import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'platform_connections' })
export class PlatformConnection {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 255 })
  userId!: string;

  @Column({ type: 'varchar', length: 32 })
  platform!: 'twitch' | 'kick';

  @Column({ name: 'external_id', type: 'varchar', length: 255 })
  externalId!: string;

  @Column({ type: 'text', array: true, default: '{}' })
  scopes!: string[];

  @Column({ name: 'access_token_encrypted', type: 'text' })
  accessTokenEncrypted!: string;

  @Column({ name: 'refresh_token_encrypted', type: 'text' })
  refreshTokenEncrypted!: string;

  @Column({ name: 'access_token_expires_at', type: 'timestamptz', nullable: true })
  accessTokenExpiresAt!: Date | null;

  @Column({ type: 'varchar', length: 32, default: 'connected' })
  status!: 'connected' | 'disconnected' | 'reconnecting' | 'error';

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
