import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoriteJobService } from './fv_job.service';
import { FavoriteJobController } from './fv_job.controller';
import { User } from '../../entities/user.entity';
import { Job } from '../../entities/job.entity'; // Thêm Job entity
import { JobFavorite } from '../../entities/job_favorite.entity'; // Thêm JobFavorite entity
import { AuthModule } from '../../modules/auth/register/auth.module';

@Module({
        imports: [
                TypeOrmModule.forFeature([User, Job, JobFavorite]), // Thêm Job và JobFavorite
                AuthModule, // Để sử dụng JwtService cho xác thực
        ],
        controllers: [FavoriteJobController], // Sửa từ UserController thành FavoriteJobController
        providers: [FavoriteJobService], // Sửa từ UserService thành FavoriteJobService
})
export class FavoriteJobModule {}
