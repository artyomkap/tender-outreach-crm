import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('prozorro_blacklist')
@Unique(['userId', 'email'])
export class ProzorroBlacklist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 320 })
  email: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
