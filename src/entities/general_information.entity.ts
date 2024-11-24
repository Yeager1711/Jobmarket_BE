import { Entity, PrimaryColumn, Column, OneToMany } from 'typeorm';
import { Job } from './job.entity';

@Entity('general_Information')
export class GeneralInformation {
  @PrimaryColumn()
  general_Information_Id: number;

  @Column()
  experience: string
  
  @Column()
  numberOfRecruits: number;

  @Column({ length: 255 })
  gender: string;

  @OneToMany(() => Job, (job) => job.generalInformation)
  jobs: Job[];
}
