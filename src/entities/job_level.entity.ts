import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('job_level')
export class JobLevel {
  @PrimaryGeneratedColumn()
  jobLevelId: number;

  @Column("simple-array")
  name: string[];
}
