import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Purchase } from './purchase.entity';

@Entity('purchase_files')
export class PurchaseFile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Purchase, (purchase) => purchase.files, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'purchase_id' })
  purchase: Purchase;

  @Column({ name: 'purchase_id' })
  purchaseId: string;

  @Column({ name: 'published_content_id' })
  publishedContentId: string;

  @Column({ name: 'file_name', type: 'varchar', nullable: true })
  fileName: string | null;

  @Column({ name: 'file_size', type: 'bigint', nullable: true })
  fileSize: number | null;

  @Column({ name: 'doc_description', type: 'text', nullable: true })
  docDescription: string | null;

  @Column({ name: 'doc_date', type: 'timestamp', nullable: true })
  docDate: Date | null;

  @Column({ type: 'text' })
  url: string;

  @Column({ name: 'doc_kind_code', length: 20, nullable: true })
  docKindCode: string | null;

  @Column({ name: 'doc_kind_name', type: 'varchar', nullable: true })
  docKindName: string | null;

  @Column({ name: 'doc_type', length: 100, nullable: true })
  docType: string | null;

  @Column({ name: 'is_downloaded', type: 'boolean', default: false })
  isDownloaded: boolean;

  @Column({ name: 'local_path', type: 'varchar', nullable: true })
  localPath: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
