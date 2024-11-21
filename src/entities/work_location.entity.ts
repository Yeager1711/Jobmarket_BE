import { Entity, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, PrimaryColumn } from 'typeorm';
import { Company } from './company.entity';
import { District } from './district.entity';

@Entity('work_location')
export class WorkLocation {
  @PrimaryColumn()
  workLocationId: number;

  @ManyToOne(() => Company, (company) => company.workLocations)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ length: 255 })
  address_name: string;

  @ManyToOne(() => District)
  @JoinColumn({ name: 'districtId' })
  district: District;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
