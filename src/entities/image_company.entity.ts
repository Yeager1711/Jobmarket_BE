import { Entity, Column, PrimaryColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity('image_company')
export class ImageCompany {
        @PrimaryColumn()
        ImageCompanyId: number;

        @PrimaryColumn()
        companyId: number; // Use companyId as the primary column to match the schema

        @ManyToOne(() => Company, (company) => company.images)
        @JoinColumn({ name: 'companyId' })
        company: Company;

        @Column({ type: 'longtext', nullable: true }) 
        image_company: string;

        @Column({ type: 'longtext', nullable: true }) 
        banner_BackgroundImage_company: string;

        @Column({ type: 'varchar', nullable: true }) 
        Business_documents: string;
}
