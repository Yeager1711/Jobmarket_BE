// job_favorite.entity.ts
import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn, BeforeInsert } from 'typeorm';
import { Job } from './job.entity';
import { User } from './user.entity';
import { randomInt } from 'crypto';

@Entity('job_favorite')
export class JobFavorite {
    @PrimaryColumn()
    favoriteId: number;

    @ManyToOne(() => Job, (job) => job.jobFavorites)
    @JoinColumn({ name: 'jobId' })
    job: Job;

    @ManyToOne(() => User, (user) => user.jobFavorites, { onDelete: 'CASCADE' }) // Thêm onDelete: CASCADE
    @JoinColumn({ name: 'userId' })
    user: User;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    saved_at: Date;

    @BeforeInsert()
    generateId() {
        this.favoriteId = randomInt(1000000, 9999999);
    }
}