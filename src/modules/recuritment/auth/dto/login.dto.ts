import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class LoginRecruitment_Dto {
    @IsEmail({}, { message: 'Email không hợp lệ' })
    @IsNotEmpty({ message: 'Email không được để trống' })
    email_hr: string;

    @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
    @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
    password: string;
}