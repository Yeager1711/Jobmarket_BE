import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('general_Information')
export class GeneralInformation {
  @PrimaryColumn()
  general_Information_Id: number;

  @Column({ length: 255 })
  rank: string;

  @Column()
  numberOfRecruits: number;

  @Column({ length: 255 })
  work_form: string;

  @Column({ length: 255 })
  gender: string;
}
