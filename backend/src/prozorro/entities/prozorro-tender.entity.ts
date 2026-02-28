import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { ProzorroTenderDoc } from './prozorro-tender-doc.entity';

@Entity('prozorro_tenders')
export class ProzorroTender {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'prozorro_id', unique: true })
  prozorroId: string;

  @Column({ name: 'tender_number' })
  tenderNumber: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ nullable: true })
  status: string | null;

  @Column({ type: 'decimal', nullable: true })
  amount: number | null;

  @Column({ nullable: true })
  currency: string | null;

  @Column({ nullable: true, name: 'procuring_entity_name' })
  procuringEntityName: string | null;

  @Column({ nullable: true, name: 'procuring_entity_id' })
  procuringEntityId: string | null;

  @Column({ nullable: true, name: 'procurement_method_type' })
  procurementMethodType: string | null;

  @Column({ type: 'jsonb', nullable: true, name: 'raw_data' })
  rawData: any;

  @Column({ type: 'timestamp', nullable: true, name: 'detail_fetched_at' })
  detailFetchedAt: Date | null;

  @Column({ type: 'timestamp', nullable: true, name: 'tender_period_end' })
  tenderPeriodEnd: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => ProzorroTenderDoc, (doc) => doc.tender)
  docs: ProzorroTenderDoc[];
}
