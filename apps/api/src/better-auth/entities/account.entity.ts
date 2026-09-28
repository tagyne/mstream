import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { BetterAuthUser } from './user.entity';

@Entity({ name: 'account' })
export class BetterAuthAccount {
  @PrimaryColumn({ type: 'text' }) id!: string;
  @Column({ type: 'text' }) accountId!: string;
  @Column({ type: 'text' }) providerId!: string;
  @Index('account_userId_idx')
  @Column({ type: 'text' })
  userId!: string;
  @ManyToOne(() => BetterAuthUser, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: BetterAuthUser;
  @Column({ type: 'text', nullable: true }) accessToken!: string | null;
  @Column({ type: 'text', nullable: true }) refreshToken!: string | null;
  @Column({ type: 'text', nullable: true }) idToken!: string | null;
  @Column({ type: 'timestamptz', nullable: true }) accessTokenExpiresAt!: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) refreshTokenExpiresAt!: Date | null;
  @Column({ type: 'text', nullable: true }) scope!: string | null;
  @Column({ type: 'text', nullable: true }) password!: string | null;
  @Column({ type: 'timestamptz' }) createdAt!: Date;
  @Column({ type: 'timestamptz' }) updatedAt!: Date;
}
