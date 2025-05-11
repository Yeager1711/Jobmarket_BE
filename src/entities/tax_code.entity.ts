import {
        Entity,
        PrimaryColumn,
        Column,
        ManyToOne,
        JoinColumn,
        CreateDateColumn,
        Index,
} from 'typeorm';
import { Company } from './company.entity';

@Entity('tax_code')
export class TaxCode {
        @PrimaryColumn()
        taxCodeId: number;

        @Index('idx_tax_code_companyId')
        @Column()
        companyId: number;

        @Index('idx_tax_code_companyTaxId')
        @Column({ type: 'varchar', length: 50 })
        companyTaxIdentificationNumber: string;

        @Index('idx_tax_code_companySize')
        @Column({ type: 'varchar' })
        companySize: string;

        @Index('idx_tax_code_personalTaxCode')
        @Column({ type: 'varchar', length: 50, nullable: true })
        personalTaxCode: string;

        @Index('idx_tax_code_createdAt')
        @CreateDateColumn({ default: () => 'CURRENT_TIMESTAMP' })
        created_at: Date;

        @ManyToOne(() => Company, (company) => company.taxCodes, {
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
        })
        @JoinColumn({ name: 'companyId' })
        company: Company;
}
