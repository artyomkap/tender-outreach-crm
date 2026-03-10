import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('outreach_email_accounts')
export class OutreachEmailAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ name: 'sender_name', type: 'varchar', nullable: true })
  senderName: string | null;

  @Column({ name: 'smtp_host', type: 'varchar' })
  smtpHost: string;

  @Column({ name: 'smtp_port', type: 'int', default: 587 })
  smtpPort: number;

  @Column({ name: 'smtp_user', type: 'varchar' })
  smtpUser: string;

  @Column({ name: 'smtp_pass', type: 'varchar' })
  smtpPass: string;

  @Column({ name: 'imap_host', type: 'varchar', nullable: true })
  imapHost: string | null;

  @Column({ name: 'imap_port', type: 'int', nullable: true })
  imapPort: number | null;

  @Column({ name: 'imap_user', type: 'varchar', nullable: true })
  imapUser: string | null;

  @Column({ name: 'imap_pass', type: 'varchar', nullable: true })
  imapPass: string | null;

  @Column({ name: 'daily_limit', type: 'int', default: 50 })
  dailyLimit: number;

  @Column({ name: 'sent_today', type: 'int', default: 0 })
  sentToday: number;

  @Column({ name: 'sent_today_date', type: 'date', nullable: true })
  sentTodayDate: string | null;

  @Column({ name: 'is_warmup_enabled', default: false })
  isWarmupEnabled: boolean;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'active',
  })
  status: 'active' | 'paused' | 'error';

  @Column({ name: 'last_error', type: 'text', nullable: true })
  lastError: string | null;

  @Column({ type: 'text', nullable: true })
  signature: string | null;

  @Column({ name: 'smtp_relay_url', type: 'varchar', nullable: true })
  smtpRelayUrl: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
