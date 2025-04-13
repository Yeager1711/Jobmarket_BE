import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './recruitment_auth.service';
import { RegisterRecruitment_Dto } from '../dto/register.dto';
import { LoginRecruitment_Dto } from '../dto/login.dto';

@Controller('auth_recruitment')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerRecruitment_Dto: RegisterRecruitment_Dto) {
    // Log dữ liệu nhận được từ FE
    console.log('Dữ liệu nhận được từ FE:', JSON.stringify(registerRecruitment_Dto, null, 2));
    
    const result = await this.authService.register(registerRecruitment_Dto);
    
    // Log kết quả trả về sau khi lưu
    console.log('Kết quả sau khi lưu:', JSON.stringify(result, null, 2));
    
    return result;
  }
}