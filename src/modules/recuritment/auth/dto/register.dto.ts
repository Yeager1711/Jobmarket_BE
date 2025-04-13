import { IsEmail, IsNotEmpty, MinLength, Matches, IsString, IsInt } from 'class-validator';

export class RegisterRecruitment_Dto {
        @IsEmail({}, { message: 'Email không hợp lệ' })
        @IsNotEmpty({ message: 'Email không được để trống' })
        email_hr: string;

        @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
        @MinLength(8, { message: 'Mật khẩu phải có ít nhất 8 ký tự' })
        @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/, {
                message: 'Mật khẩu phải có ít nhất 1 chữ hoa, 1 số và 1 ký tự đặc biệt (@$!%*?&)',
        })
        password: string;

        @IsString({ message: 'Tên công ty phải là chuỗi' })
        @IsNotEmpty({ message: 'Tên công ty không được để trống' })
        companyName: string;

        @IsString({ message: 'Số điện thoại công ty phải là chuỗi' })
        @IsNotEmpty({ message: 'Số điện thoại công ty không được để trống' })
        @Matches(/^\+\d{7,15}$/, {
                message: 'Số điện thoại không hợp lệ. Vui lòng nhập đúng định dạng quốc tế (VD: +84333409892)',
        })
        phoneNumber_company: string;

        @IsString({ message: 'Địa chỉ phải là chuỗi' })
        @IsNotEmpty({ message: 'Địa chỉ không được để trống' })
        address: string; // Định dạng: "Quận 1, Thành phố Hồ Chí Minh"

        @IsString({ message: 'Ngành nghề phải là chuỗi' })
        @IsNotEmpty({ message: 'Ngành nghề không được để trống' })
        industry: string; // Tên ngành nghề (VD: "Software", "Banking")
        @IsNotEmpty({ message: 'Họ không được để trống' })
        @IsString({ message: 'Họ phải là chuỗi ký tự' })
        firstName: string;

        @IsNotEmpty({ message: 'Tên không được để trống' })
        @IsString({ message: 'Tên phải là chuỗi ký tự' })
        lastName: string;
}
