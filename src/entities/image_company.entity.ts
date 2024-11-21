import { Entity, Column,PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity('image_company')
export class ImageCompany {
  @PrimaryColumn()
  ImageCompanyId: number;

  @ManyToOne(() => Company, (company) => company.images)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @Column({ type: 'longtext' })
  image_company: string;
}
