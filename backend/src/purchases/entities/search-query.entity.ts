import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity('search_queries')
export class SearchQuery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'query_params', type: 'jsonb' })
  queryParams: Record<string, unknown>;

  @Column({ name: 'results_count', type: 'int', default: 0 })
  resultsCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
