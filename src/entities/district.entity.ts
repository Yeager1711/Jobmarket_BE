import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('district')
export class District {
  @PrimaryColumn()
  districtId: number;

  @Column({ length: 255 })
  name: string;
}
