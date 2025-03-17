import {
        Entity,
        Column,
        CreateDateColumn,
        UpdateDateColumn,
        OneToMany,
        PrimaryColumn,
} from 'typeorm';
import { JobApplication } from './job_application.entity'; // Sửa tên file nếu cần
import { ResumeCV } from './resumecv.entity';
import { JobFavorite } from './job_favorite.entity'; // Thêm import

@Entity('user')
export class User {
        @PrimaryColumn({ unique: true })
        userId: number;

        @Column()
        password: string;

        @Column({ nullable: true })
        firstName: string;

        @Column({ nullable: true })
        lastName: string;

        @Column({ unique: true })
        email: string;

        @Column({ nullable: true })
        phoneNumber: string;

        @Column({ nullable: true })
        gender: string;

        @Column({ type: 'date', nullable: true })
        dateOfBirth: Date;

        @Column({ nullable: true })
        address: string;

        @Column({ type: 'longtext', nullable: true })
        image: string;

        @Column({ nullable: true })
        jobTitle: string;

        @Column({ nullable: true })
        nationality: string;

        @Column({ nullable: true })
        highestDegree: string;

        @Column({ nullable: true })
        industry: string;

        @Column({ nullable: true })
        experienceLevel: string;

        @Column({ nullable: true })
        yearOfNumberExperience: string;

        @Column({ nullable: true })
        expectedSalary: number;

        @Column({ type: 'text', nullable: true })
        skills: string;

        @Column({ type: 'text', nullable: true })
        education: string;

        @Column({ default: false })
        isJobSeeker: boolean;

        @Column({ default: true })
        isProfileVisible: boolean;

        @CreateDateColumn()
        createdAt: Date;

        @UpdateDateColumn()
        updatedAt: Date;

        @Column({ type: 'datetime', nullable: true })
        lastLogin: Date;

        @Column({ default: 'Active' })
        status: string;

        @OneToMany(() => JobApplication, (jobApplication) => jobApplication.user)
        jobApplications: JobApplication[];

        @OneToMany(() => JobFavorite, (jobFavorite) => jobFavorite.user)
        jobFavorites: JobFavorite[];

        @OneToMany(() => ResumeCV, (resumeCV) => resumeCV.user, { cascade: true })
        resumes: ResumeCV[];
}
