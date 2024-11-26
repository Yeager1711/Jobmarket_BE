import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('job_type')
export class JobType {
  @PrimaryGeneratedColumn()
  jobTypeId: number;

  @Column("simple-array")
  work_at: string[];

  @Column("simple-array")
  name: string[];
}
