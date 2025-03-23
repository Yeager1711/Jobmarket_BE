import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserService } from './user.service';
import { PayOSService } from '../payment/payos/payos.service';
import { UserController } from './user.controller';
import { User } from '../../../entities/user.entity';
import { ResumeCV } from '../../../entities/resumecv.entity';
import { AuthModule } from '../register/auth.module'; // Import AuthModule
import { JobFavorite } from '../../../entities/job_favorite.entity'; // Import JobFavorite entity
import { Job } from 'src/entities/job.entity';
import { JobApplication } from '../../../entities/job_application.entity'; // Import JobApplication entity
import { Order } from 'src/entities/order.entity';

@Module({
        imports: [
                TypeOrmModule.forFeature([User, ResumeCV, JobFavorite, JobApplication, Job, Order]),
                AuthModule,
        ],
        controllers: [UserController],
        providers: [UserService, PayOSService],
        exports: [UserService],
})
export class UserModule {}
