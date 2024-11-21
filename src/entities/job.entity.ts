import { 
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn 
} from 'typeorm';
import { JobLevel } from './job_level.entity';
import { JobType } from './job_type.entity';
import { JobIndustry } from './job_industry.entity';
import { WorkLocation } from './work_location.entity';
import { GeneralInformation } from './general_information.entity';
import { Company } from './company.entity';
import { RefJob } from './ref_job.entity';

@Entity('job')
export class Job {
  @PrimaryGeneratedColumn()
  jobId: number;

  @Column({ length: 255 })
  title: string;

  @ManyToOne(() => JobLevel)
  @JoinColumn({ name: 'jobLevelId' })
  jobLevel: JobLevel;

  @ManyToOne(() => JobType)
  @JoinColumn({ name: 'jobTypeId' })
  jobType: JobType;

  @ManyToOne(() => JobIndustry)
  @JoinColumn({ name: 'jobIndustryId' })
  jobIndustry: JobIndustry;

  @ManyToOne(() => WorkLocation)
  @JoinColumn({ name: 'workLocationId' })
  workLocation: WorkLocation;

  @ManyToOne(() => GeneralInformation)
  @JoinColumn({ name: 'general_Information_Id' })
  generalInformation: GeneralInformation;

  @ManyToOne(() => Company, (company) => company.jobs)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ManyToOne(() => RefJob)
  @JoinColumn({ name: 'ref_job_Id' })
  refJob: RefJob;

  @Column({ nullable: true })
  salary_from: number;

  @Column({ nullable: true })
  salary_to: number;

  @Column({ type: 'date' })
  expire_on: Date;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'text' })
  requirement: string;

  @Column({ type: 'text' })
  benefits: string;

  @Column({ length: 255 })
  work_time: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
