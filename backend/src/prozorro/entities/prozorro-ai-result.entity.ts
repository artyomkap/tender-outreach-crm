import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ProzorroTender } from './prozorro-tender.entity';

@Entity('prozorro_ai_results')
@Unique(['userId', 'tenderId'])
export class ProzorroAiResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'tender_id' })
  tenderId: string;

  @ManyToOne(() => ProzorroTender)
  @JoinColumn({ name: 'tender_id' })
  tender: ProzorroTender;

  @Column({ type: 'text', nullable: true, name: 'search_query' })
  searchQuery: string | null;

  @Column({ type: 'text', nullable: true })
  subject: string | null;

  @Column({ type: 'text', nullable: true })
  body: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
