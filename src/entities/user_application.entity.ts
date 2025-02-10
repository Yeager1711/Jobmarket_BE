import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Job } from './job.entity';

@Entity('job_application')
export class JobApplication {
    @PrimaryGeneratedColumn()
    applicationId: number;

    @ManyToOne(() => User, (user) => user.jobApplications, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Job, (job) => job.jobApplications, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'jobId' })
    job: Job;

    @Column({ type: 'enum', enum: ['Pending', 'Accepted', 'Rejected'], default: 'Pending' })
    status: string;

    @CreateDateColumn()
    appliedAt: Date;
}
