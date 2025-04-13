import { Module } from '@nestjs/common';
import { AuthRecuitment_Service } from './login_recuitment.service';
import { AuthUserController } from './login_recruitment_controller';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Recruitment } from '../../../../entities/recruitment.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Recruitment]),
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'jobmarketJWTSECRET_KEYVALUES',
            signOptions: { expiresIn: '1d' },
        }),
    ],
    controllers: [AuthUserController],
    providers: [AuthRecuitment_Service, JwtStrategy],
    exports: [AuthRecuitment_Service],
})
export class AuthRecuitmentLogin_Module {}
