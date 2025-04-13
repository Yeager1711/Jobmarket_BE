import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Company } from './company.entity';

@Entity('recruitment')
export class Recruitment {
        @PrimaryColumn({ type: 'int' })
        recruitment_Id: number;

        @Column({ type: 'varchar', length: 255, nullable: true })
        email_hr: string;

        @Column({ type: 'varchar', length: 255, nullable: true })
        password: string;

        // Khóa ngoại companyId bắt buộc
        @Column({ type: 'int' })
        companyId: number;

        @Column({ type: 'varchar', nullable: true })
        firstName: string;

        @Column({ type: 'varchar', nullable: true })
        lastName: string;

        @Column({ type: 'longtext', nullable: true })
        avatar_hr: string;

        @Column({ type: 'varchar', nullable: true })
        gender: string;

        // Quan hệ ManyToOne với Company
        @ManyToOne(() => Company, (company) => company.recruitmentEntity, {
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE',
        })
        @JoinColumn({ name: 'companyId' }) // Khóa ngoại là cột 'companyId'
        company: Company;
}
