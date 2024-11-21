import { Entity, PrimaryColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ImageCompany } from './image_company.entity';
import { WorkLocation } from './work_location.entity';
import { Job } from './job.entity';

@Entity('company')
export class Company {
  @PrimaryColumn()
  companyId: number;

  @Column({ length: 255 })
  name: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => ImageCompany, (imageCompany) => imageCompany.company)
  images: ImageCompany[];

  @OneToMany(() => WorkLocation, (workLocation) => workLocation.company)
  workLocations: WorkLocation[];

  @OneToMany(() => Job, (job) => job.company)
  jobs: Job[];
}
