import {
        Entity,
        PrimaryColumn,
        Column,
        OneToMany,
        CreateDateColumn,
        UpdateDateColumn,
        OneToOne,
        JoinColumn,
} from 'typeorm';
import { ImageCompany } from './image_company.entity';
import { WorkLocation } from './work_location.entity';
import { Job } from './job.entity';
import { Recruitment } from './recruitment.entity';

@Entity('company')
export class Company {
        @PrimaryColumn()
        companyId: number;

        @Column({ unique: true })
        name: string;

        @CreateDateColumn()
        created_at: Date;

        @UpdateDateColumn()
        updated_at: Date;

        @Column({ type: 'varchar', length: 20 })
        phoneNumber_company: string;

        // Trường recruitment là tùy chọn và liên kết với recruitment_Id
        @Column({ type: 'int', nullable: true })
        recruitment: number;

        // Quan hệ OneToOne với Recruitment (tùy chọn)
        @OneToOne(() => Recruitment, (recruitment) => recruitment.company, { nullable: true })
        @JoinColumn({ name: 'recruitment' }) // Khóa ngoại là cột 'recruitment'
        recruitmentEntity: Recruitment;

        @OneToMany(() => ImageCompany, (imageCompany) => imageCompany.company)
        images: ImageCompany[];

        @OneToMany(() => WorkLocation, (workLocation) => workLocation.company)
        workLocations: WorkLocation[];

        @OneToMany(() => Job, (job) => job.company)
        jobs: Job[];
}








// import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';
// import { ImageCompany } from './imageCompany.entity';
// import { WorkLocation } from './workLocation.entity';
// import { Job } from './job.entity';

// @Entity('company')
// export class Company {
//   @PrimaryColumn()
//   companyId: number;

//   @Column()
//   name: string;

//   @Column()
//   created_at: Date;

//   @Column()
//   updated_at: Date;

//   @Column()
//   phoneNumber_company: number;

//   @Column()
//   recruitment: number;

//   @OneToMany(() => ImageCompany, (image) => image.company)
//   images: ImageCompany[];

//   @OneToMany(() => WorkLocation, (workLocation) => workLocation.company)
//   workLocations: WorkLocation[];

//   @OneToMany(() => Job, (job) => job.company)
//   jobs: Job[];
// }

// import {
//         Entity,
//         PrimaryColumn,
//         Column,
//         OneToMany,
//         CreateDateColumn,
//         UpdateDateColumn,
//         OneToOne,
//         JoinColumn,
// } from 'typeorm';
// import { ImageCompany } from './image_company.entity';
// import { WorkLocation } from './work_location.entity';
// import { Job } from './job.entity';
// import { Recruitment } from './recruitment.entity'; // Import entity Recruitment

// @Entity('company')
// export class Company {
//         @PrimaryColumn()
//         companyId: number;

//         @Column({ unique: true })
//         name: string;

//         @CreateDateColumn()
//         created_at: Date;

//         @UpdateDateColumn()
//         updated_at: Date;

//         @Column({ type: 'varchar', length: 20 }) // Thay đổi từ int sang varchar
//         phoneNumber_company: string;

//         // Thêm trường recruitment, cho phép NULL
//         @Column({ type: 'int', nullable: true })
//         recruitment: number;

//         // Mối quan hệ 1-1 với Recruitment
//         @OneToOne(() => Recruitment, (recruitment) => recruitment.company, { nullable: true })
//         @JoinColumn({ name: 'recruitment' }) // Cột recruitment trong bảng company sẽ là khóa ngoại
//         recruitmentEntity: Recruitment;

//         @OneToMany(() => ImageCompany, (imageCompany) => imageCompany.company)
//         images: ImageCompany[];

//         @OneToMany(() => WorkLocation, (workLocation) => workLocation.company)
//         workLocations: WorkLocation[];

//         @OneToMany(() => Job, (job) => job.company)
//         jobs: Job[];
// }
