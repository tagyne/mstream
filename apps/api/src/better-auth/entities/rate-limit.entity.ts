import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'rateLimit' })
export class BetterAuthRateLimit {
  @PrimaryColumn({ type: 'text' }) id!: string;
  @Column({ type: 'text', unique: true }) key!: string;
  @Column({ type: 'integer' }) count!: number;
  @Column({ type: 'bigint' }) lastRequest!: string;
}
