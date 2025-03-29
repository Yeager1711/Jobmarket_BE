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

        @Column({ type: 'float', nullable: true }) // Thêm trường totalAmount
        totalAmount: number;

        @Column({ default: 'pending' }) // Thêm trường status
        status: string;

        @Column({ type: 'varchar', length: 20, nullable: true }) // Sửa thành VARCHAR(20) để chứa orderCode
        orderCode: string;

        @Column({ type: 'text', nullable: true })
        analyze_text: string;

        @Column()
        disable: boolean;

        @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
        created_at: Date;
}
