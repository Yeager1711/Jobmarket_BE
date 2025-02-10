import {
    Entity,
    Column,
    PrimaryColumn,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    BeforeInsert
} from 'typeorm';
import { User } from './user.entity';
import { randomInt } from 'crypto';

@Entity('resumecv')
export class ResumeCV {
    @PrimaryColumn() // Dùng số ngẫu nhiên làm khóa chính
    resumeCVId: number;

    @Column({nullable: true})
    name_file:string

    @Column({ type: 'longtext', nullable: false }) // Lưu ảnh Base64 hoặc URL
    CV_img: string;

    @Column({ default: false }) // CV mặc định
    isDefault: boolean;

    @Column({ default: 0 }) // Số lượt xem CV
    view: number;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User, (user) => user.userId, { onDelete: 'CASCADE' }) 
    @JoinColumn({ name: 'userId' })
    user: User;

    @BeforeInsert()
    generateId() {
        this.resumeCVId = randomInt(1000000, 9999999); // Tạo số ngẫu nhiên 7 chữ số
    }
}
