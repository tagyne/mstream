import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'user' })
export class BetterAuthUser {
  @PrimaryColumn({ type: 'text' }) id!: string;
  @Column({ type: 'text' }) name!: string;
  @Column({ type: 'text', unique: true }) email!: string;
  @Column({ type: 'boolean' }) emailVerified!: boolean;
  @Column({ type: 'text', nullable: true }) image!: string | null;
  @Column({ type: 'timestamptz' }) createdAt!: Date;
  @Column({ type: 'timestamptz' }) updatedAt!: Date;
}
