import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Purchase } from './purchase.entity';
import { SearchQuery } from './search-query.entity';

@Entity('found_purchases')
export class FoundPurchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => Purchase, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_id' })
  purchase: Purchase;

  @Column({ name: 'purchase_id' })
  purchaseId: string;

  @ManyToOne(() => SearchQuery, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'search_query_id' })
  searchQuery: SearchQuery | null;

  @Column({ name: 'search_query_id', type: 'uuid', nullable: true })
  searchQueryId: string | null;

  @Column({ name: 'is_favorite', type: 'boolean', default: false })
  isFavorite: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
