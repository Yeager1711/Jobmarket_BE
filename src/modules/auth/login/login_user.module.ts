import { Module } from '@nestjs/common';
import { AuthUserService } from './login_user.service';
import { AuthUserController } from './login_user.controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './../../../entities/user.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([User]),
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'jobmarketJWTSECRET_KEYVALUES',
            signOptions: { expiresIn: '1d' },
        }),
    ],
    controllers: [AuthUserController],
    providers: [AuthUserService, JwtStrategy],
    exports: [AuthUserService],
})
export class AuthUserModule {}
