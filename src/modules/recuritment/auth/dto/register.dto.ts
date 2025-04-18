import { IsString, IsNotEmpty, Length } from 'class-validator';

export class RegisterRecruitment_Dto {
        @IsString()
        @IsNotEmpty({ message: 'Email không được để trống' })
        email_hr: string;

        @IsString()
        @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
        password: string;

        @IsString()
        @IsNotEmpty({ message: 'Tên công ty không được để trống' })
        companyName: string;

        @IsString()
        @IsNotEmpty({ message: 'Số điện thoại công ty không được để trống' })
        phoneNumber_company: string;

        @IsString()
        @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
        address: string;

        @IsString()
        @IsNotEmpty({ message: 'Ngành nghề không được để trống' })
        industry: string;

        @IsString()
        @IsNotEmpty({ message: 'Họ không được để trống' })
        firstName: string;

        @IsString()
        @IsNotEmpty({ message: 'Tên không được để trống' })
        lastName: string;

        @IsString()
        @IsNotEmpty({ message: 'Mô tả công ty không được để trống' })
        @Length(1, 255, { message: 'Mô tả công ty phải từ 1 đến 255 ký tự' })
        company_description: string;
}
