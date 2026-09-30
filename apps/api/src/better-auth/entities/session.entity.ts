import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BetterAuthUser } from './user.entity';

@Entity({ name: 'session' })
export class BetterAuthSession {
  @PrimaryColumn({ type: 'text' }) id!: string;
  @Column({ type: 'timestamptz' }) expiresAt!: Date;
  @Column({ type: 'text', unique: true }) token!: string;
  @Column({ type: 'timestamptz' }) createdAt!: Date;
  @Column({ type: 'timestamptz' }) updatedAt!: Date;
  @Column({ type: 'text', nullable: true }) ipAddress!: string | null;
  @Column({ type: 'text', nullable: true }) userAgent!: string | null;
  @Index('session_userId_idx')
  @Column({ type: 'text' })
  userId!: string;
  @ManyToOne(() => BetterAuthUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: BetterAuthUser;
}
