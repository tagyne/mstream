import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformTables1710000000000 implements MigrationInterface {
  name = 'CreatePlatformTables1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stream_profiles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar(255) NOT NULL,
        platform varchar(32) NOT NULL,
        external_channel_id varchar(255) NOT NULL,
        title text,
        category_id varchar(255),
        CONSTRAINT uq_stream_profiles_user_platform UNIQUE (user_id, platform)
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS stream_profiles');
  }
}
