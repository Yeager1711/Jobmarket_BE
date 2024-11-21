import { Entity, Column, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from 'typeorm';

@Entity('ref_job')
export class RefJob {
  @PrimaryColumn()
  ref_job_Id: number;

  @Column()
  ref_Id: number;

  @Column({ length: 255 })
  ref_url: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
