// job_application.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, BeforeInsert } from 'typeorm';
import { Job } from './job.entity';
import { User } from './user.entity';
import { JobFavorite } from './job_favorite.entity';
import { randomInt } from 'crypto';

@Entity('job_application')
export class JobApplication {
    @PrimaryColumn()
    applicationId: number;

    @ManyToOne(() => User, (user) => user.jobApplications, { onDelete: 'CASCADE' }) // Thêm onDelete: CASCADE
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Job, (job) => job.jobApplications)
    @JoinColumn({ name: 'jobId' })
    job: Job;

    @ManyToOne(() => JobFavorite, { nullable: true })
    @JoinColumn({ name: 'favoriteId' })
    favorite: JobFavorite;

    @Column({ type: 'varchar', length: 20, default: 'Pending' })
    status: string;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    applied_at: Date;

    @BeforeInsert()
    generateId() {
        this.applicationId = randomInt(1000000, 9999999);
    }
}