import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('job_industry')
export class JobIndustry {
  @PrimaryColumn()
  jobIndustryId: number;

  @Column({ length: 255 })
  name: string;
}
