import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Purchase } from '../../purchases/entities/purchase.entity';

@Entity('email_messages')
export class EmailMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  direction: 'sent' | 'received';

  @Column({ name: 'contact_email', type: 'varchar', length: 320 })
  contactEmail: string;

  @Column({ type: 'text', default: '' })
  subject: string;

  @Column({ name: 'body_text', type: 'text', default: '' })
  bodyText: string;

  @Column({ name: 'body_html', type: 'text', nullable: true })
  bodyHtml: string | null;

  @Column({ name: 'message_id', type: 'varchar', nullable: true })
  messageId: string | null;

  @Column({ name: 'in_reply_to', type: 'varchar', nullable: true })
  inReplyTo: string | null;

  @ManyToOne(() => Purchase, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'purchase_id' })
  purchase: Purchase | null;

  @Column({ name: 'purchase_id', type: 'uuid', nullable: true })
  purchaseId: string | null;

  @Column({ name: 'is_read', type: 'boolean', default: false })
  isRead: boolean;

  @Column({ name: 'account_id', type: 'uuid', nullable: true, default: null })
  accountId: string | null;

  @Column({ name: 'email_date', type: 'timestamp', nullable: true, default: null })
  emailDate: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
