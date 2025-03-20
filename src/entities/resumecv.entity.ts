import {
    Entity,
    Column,
    PrimaryColumn,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn,
    BeforeInsert,
    OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { randomInt } from 'crypto';
import { Order } from './order.entity'; // Thêm import

@Entity('resumecv')
export class ResumeCV {
    @PrimaryColumn()
    resumeCVId: number;

    @Column({ nullable: true })
    name_file: string;

    @Column({ type: 'longtext', nullable: false })
    CV_img: string;

    @Column({ type: 'boolean', default: false })
    isDefault: boolean;

    @Column({ default: 0 })
    view: number;

    @UpdateDateColumn()
    updatedAt: Date;

    @ManyToOne(() => User, (user) => user.userId, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @OneToMany(() => Order, (order) => order.resume) // Thêm quan hệ với Order
    orders: Order[];

    @BeforeInsert()
    generateId() {
        this.resumeCVId = randomInt(1000000, 9999999); // Tạo số ngẫu nhiên 7 chữ số
    }
}