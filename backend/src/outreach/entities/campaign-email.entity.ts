import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OutreachCampaign } from './campaign.entity';
import { OutreachCampaignStep } from './campaign-step.entity';

@Entity('outreach_campaign_emails')
export class OutreachCampaignEmail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'campaign_id', type: 'uuid' })
  campaignId: string;

  @Column({ name: 'campaign_step_id', type: 'uuid' })
  campaignStepId: string;

  @Column({ name: 'campaign_lead_id', type: 'uuid' })
  campaignLeadId: string;

  @Column({ name: 'lead_id', type: 'uuid' })
  leadId: string;

  @Column({ name: 'email_account_id', type: 'uuid' })
  emailAccountId: string;

  @Column({ name: 'to_email', type: 'varchar' })
  toEmail: string;

  @Column({ type: 'varchar', nullable: true })
  subject: string | null;

  @Column({ type: 'text' })
  body: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'scheduled',
  })
  status: 'scheduled' | 'sent' | 'opened' | 'replied' | 'bounced' | 'failed';

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt: Date | null;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date | null;

  @Column({ name: 'opened_at', type: 'timestamp', nullable: true })
  openedAt: Date | null;

  @Column({ name: 'replied_at', type: 'timestamp', nullable: true })
  repliedAt: Date | null;

  @Column({ name: 'message_id', type: 'varchar', nullable: true })
  messageId: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ name: 'reply_text', type: 'text', nullable: true })
  replyText: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => OutreachCampaign, (c) => c.emails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_id' })
  campaign: OutreachCampaign;

  @ManyToOne(() => OutreachCampaignStep, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'campaign_step_id' })
  step: OutreachCampaignStep;
}
