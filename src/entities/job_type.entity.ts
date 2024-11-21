import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('job_type')
export class JobType {
  @PrimaryGeneratedColumn()
  jobTypeId: number;

  @Column({ length: 255 })
  name: string;
}
