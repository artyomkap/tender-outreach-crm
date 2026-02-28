import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('prozorro_web_results')
@Unique(['userId', 'url'])
export class ProzorroWebResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'search_query' })
  searchQuery: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'text', default: '' })
  title: string;

  @Column({ type: 'text', default: '' })
  snippet: string;

  @Column({ default: '' })
  favicon: string;

  @Column({ type: 'jsonb', default: [], name: 'parsed_emails' })
  parsedEmails: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
