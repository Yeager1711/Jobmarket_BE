import { Entity, Column, ManyToOne, JoinColumn, BeforeInsert, PrimaryColumn, Index } from 'typeorm';
import { randomInt } from 'crypto';
import { User } from './user.entity';
import { Job } from './job.entity';
import { ResumeCV } from './resumecv.entity';

@Entity('order')
@Index(['orderId', 'userId', 'jobId', 'resumeId'], { unique: true })
export class Order {
        @PrimaryColumn()
        orderId: number;

        @ManyToOne(() => User, (user) => user.orders, { onDelete: 'CASCADE' })
        @JoinColumn({ name: 'userId' })
        user: User;

        @Column()
        userId: number;

        @ManyToOne(() => Job, (job) => job.orders, { onDelete: 'CASCADE' })
        @JoinColumn({ name: 'jobId' })
        job: Job;

        @Column()
        jobId: number;

        @ManyToOne(() => ResumeCV, (resume) => resume.orders, { onDelete: 'CASCADE' })
        @JoinColumn({ name: 'resumeId' })
        resume: ResumeCV;

        @Column()
        resumeId: number;

        @Column({ type: 'float', nullable: true })
        totalAmount: number;

        @Column({ default: 'pending' })
        status: string;

        @Column({ type: 'varchar', length: 20, nullable: true })
        orderCode: string;

        @Column({ type: 'text', nullable: true })
        analyze_text: string;

        // Trường hiện tại cho mức độ phù hợp với công việc
        @Column({ type: 'float', nullable: true })
        competitivenessFit: number;

        // Thêm các trường mới để lưu 7 giá trị phần trăm
        @Column({ type: 'float', nullable: true })
        technicalStrength: number;

        @Column({ type: 'float', nullable: true })
        experienceStrength: number;

        @Column({ type: 'float', nullable: true })
        softSkillsStrength: number;

        @Column({ type: 'float', nullable: true })
        educationScore: number;

        @Column({ type: 'float', nullable: true })
        realExperienceScore: number;

        @Column({ type: 'float', nullable: true })
        jobRequirementMatch: number;

        @Column({ type: 'float', nullable: true })
        competitorComparison: number;

        @Column({ type: 'boolean', default: false })
        disable: boolean;

        @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
        created_at: Date;
}
