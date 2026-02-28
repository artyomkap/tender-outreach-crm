import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProzorroTender } from './prozorro-tender.entity';

@Entity('prozorro_tender_docs')
export class ProzorroTenderDoc {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tender_id' })
  tenderId: string;

  @ManyToOne(() => ProzorroTender, (t) => t.docs)
  @JoinColumn({ name: 'tender_id' })
  tender: ProzorroTender;

  @Column({ name: 'document_id' })
  documentId: string;

  @Column({ type: 'text' })
  title: string;

  @Column({ nullable: true })
  format: string | null;

  @Column({ type: 'text' })
  url: string;

  @Column({ nullable: true, name: 'document_type' })
  documentType: string | null;

  @Column({ type: 'text', nullable: true, name: 'parsed_text' })
  parsedText: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
