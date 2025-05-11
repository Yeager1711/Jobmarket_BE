import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity('company_industry')
export class CompanyIndustry {
    @PrimaryColumn()
    companyIndustry_ID: number;

    @Column({ type: 'varchar', nullable: true })
    name: string;

    @Column() // Explicitly define companyId to match the JoinColumn
    companyId: number;

    @ManyToOne(() => Company, (company) => company.companyIndustries)
    @JoinColumn({ name: 'companyId', referencedColumnName: 'companyId' })
    company: Company;
}













// import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
// import { Company } from './company.entity';

// @Entity('company_industry')
// export class CompanyIndustry {
//     @PrimaryColumn()
//     companyIndustry_ID: number;

//     @Column({ type: 'varchar', nullable: true })
//     name: string;

//     @ManyToOne(() => Company, (company) => company.companyIndustries)
//     @JoinColumn({ name: 'companyId', referencedColumnName: 'companyId' })
//     company: Company;
// }



