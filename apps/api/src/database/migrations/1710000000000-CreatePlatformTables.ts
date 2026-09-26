import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePlatformTables1710000000000 implements MigrationInterface {
  name = 'CreatePlatformTables1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS platform_connections (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar(255) NOT NULL,
        platform varchar(32) NOT NULL,
        external_id varchar(255) NOT NULL,
        scopes text[] NOT NULL DEFAULT '{}',
        access_token_encrypted text NOT NULL,
        refresh_token_encrypted text NOT NULL,
        access_token_expires_at timestamptz,
        status varchar(32) NOT NULL DEFAULT 'connected',
        last_error text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_platform_connections_user_platform UNIQUE (user_id, platform)
      )
    `);
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
    await queryRunner.query('DROP TABLE IF EXISTS platform_connections');
  }
}
