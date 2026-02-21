import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AiSearchTerm } from './ai-search-term.entity';
import { User } from '../../users/entities/user.entity';

@Entity('web_search_results')
export class WebSearchResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => AiSearchTerm, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ai_search_term_id' })
  searchTerm: AiSearchTerm;

  @Column({ name: 'ai_search_term_id' })
  searchTermId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'text' })
  query: string;

  @Column({ type: 'text' })
  url: string;

  @Column({ type: 'text', default: '' })
  title: string;

  @Column({ type: 'text', default: '' })
  snippet: string;

  @Column({ type: 'text', default: '' })
  favicon: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
