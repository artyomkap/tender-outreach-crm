import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PurchaseFile } from './purchase-file.entity';
import { UserPurchaseHistory } from './user-purchase-history.entity';

@Entity('purchases')
export class Purchase {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'purchase_number', unique: true })
  purchaseNumber: string;

  @Column({ name: 'object_info', type: 'text', nullable: true })
  objectInfo: string | null;

  @Column({ name: 'max_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  maxPrice: number | null;

  @Column({ name: 'currency_code', length: 10, nullable: true })
  currencyCode: string | null;

  @Column({ name: 'purchase_type', length: 100, nullable: true })
  purchaseType: string | null;

  @Column({ type: 'int', nullable: true })
  stage: number | null;

  @Column({ type: 'int', nullable: true })
  region: number | null;

  @Column({ name: 'published_at', type: 'timestamp', nullable: true })
  publishedAt: Date | null;

  @Column({ name: 'updated_at_external', type: 'timestamp', nullable: true })
  updatedAtExternal: Date | null;

  @Column({ type: 'jsonb', nullable: true })
  customers: any | null;

  @Column({ type: 'jsonb', nullable: true })
  owners: any | null;

  @Column({ name: 'raw_list_data', type: 'jsonb', nullable: true })
  rawListData: any | null;

  @Column({ name: 'raw_detail_data', type: 'jsonb', nullable: true })
  rawDetailData: any | null;

  @Column({ name: 'detail_fetched_at', type: 'timestamp', nullable: true })
  detailFetchedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => PurchaseFile, (file) => file.purchase)
  files: PurchaseFile[];

  @OneToMany(() => UserPurchaseHistory, (history) => history.purchase)
  history: UserPurchaseHistory[];
}
