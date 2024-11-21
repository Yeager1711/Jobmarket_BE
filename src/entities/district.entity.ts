import { Entity, Column, PrimaryGeneratedColumn ,PrimaryColumn } from 'typeorm';

@Entity('district')
export class District {
  @PrimaryGeneratedColumn()
  districtId: number;

  @Column({ length: 255 })
  name: string;
}
