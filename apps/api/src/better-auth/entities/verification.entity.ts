import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ name: 'verification' })
export class BetterAuthVerification {
  @PrimaryColumn({ type: 'text' }) id!: string;
  @Index('verification_identifier_idx')
  @Column({ type: 'text' })
  identifier!: string;
  @Column({ type: 'text' }) value!: string;
  @Column({ type: 'timestamptz' }) expiresAt!: Date;
  @Column({ type: 'timestamptz' }) createdAt!: Date;
  @Column({ type: 'timestamptz' }) updatedAt!: Date;
}
