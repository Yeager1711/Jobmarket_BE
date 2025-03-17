import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../../entities/user.entity';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthUserService {
      constructor(
            @InjectRepository(User)
            private readonly userRepository: Repository<User>,
            private readonly jwtService: JwtService
      ) {}

      async validateUser(loginDto: LoginDto) {
            const user = await this.userRepository.findOne({ where: { email: loginDto.email } });

            if (!user) {
                  throw new UnauthorizedException({
                        field: 'email',
                        message: 'Email không tồn tại',
                  });
            }

            const isMatch = await bcrypt.compare(loginDto.password, user.password);
            if (!isMatch) {
                  throw new UnauthorizedException({
                        field: 'password',
                        message: 'Mật khẩu không chính xác',
                  });
            }

            const payload = {
                  userId: user.userId,
            };
            const accessToken = this.jwtService.sign(payload, { expiresIn: '30d' });

            return { accessToken };
      }
}
