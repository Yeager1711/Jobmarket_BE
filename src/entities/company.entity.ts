import {
        Entity,
        PrimaryColumn,
        Column,
        OneToMany,
        CreateDateColumn,
        UpdateDateColumn,
        OneToOne,
        JoinColumn,
} from 'typeorm';
import { ImageCompany } from './image_company.entity';
import { WorkLocation } from './work_location.entity';
import { Job } from './job.entity';
import { Recruitment } from './recruitment.entity';
import { CompanyIndustry } from './company_industry.entity';

@Entity('company')
export class Company {
        @PrimaryColumn()
        companyId: number;

        @Column({ unique: true })
        name: string;

        @CreateDateColumn()
        created_at: Date;

        @UpdateDateColumn()
        updated_at: Date;

        @Column({ type: 'varchar', length: 20 })
        phoneNumber_company: string;

        @Column({ type: 'text', nullable: true })
        company_description: string;

        @Column({ type: 'int', nullable: true })
        recruitment: number;

        @OneToOne(() => Recruitment, (recruitment) => recruitment.company, { nullable: true })
        @JoinColumn({ name: 'recruitment' })
        recruitmentEntity: Recruitment;

        @OneToMany(() => ImageCompany, (imageCompany) => imageCompany.company)
        images: ImageCompany[];

        @OneToMany(() => WorkLocation, (workLocation) => workLocation.company)
        workLocations: WorkLocation[];

        @OneToMany(() => Job, (job) => job.company)
        jobs: Job[];

        @OneToMany(() => CompanyIndustry, (companyIndustry) => companyIndustry.company)
        companyIndustries: CompanyIndustry[];
}
