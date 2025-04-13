import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { JobController } from './modules/job/job.controller';
import { JobService } from './modules/job/job.service';

// Import entities
import { Company } from './entities/company.entity';
import { District } from './entities/district.entity';
import { ImageCompany } from './entities/image_company.entity';
import { JobIndustry } from './entities/job_industry.entity';
import { JobLevel } from './entities/job_level.entity';
import { JobType } from './entities/job_type.entity';
import { Job } from './entities/job.entity';
import { RefJob } from './entities/ref_job.entity';
import { WorkLocation } from './entities/work_location.entity';
import { GeneralInformation } from './entities/general_information.entity';
import { ResumeCV } from './entities/resumecv.entity';

// Import modules
import { JobModule } from './modules/job/job.module';
import { AuthModule } from './modules/auth/register/auth.module';
import { AuthUserModule } from './modules/auth/login/login_user.module';
import { UserModule } from './modules/auth/user/user.module';
import { AuthMiddleware } from './middlewares//auth/auth.middleware';
import { FavoriteJobModule } from './modules/favorite_Job/fv_job.module';
import { AppliedJobModule } from './modules/applied_Job/applied_job.module';
import { PayOSModule } from './modules/auth/payment/payos/payos.module';
import { OrderModule } from './modules/auth/orders/order.module';

//Recruitment
import { AuthReCuitmentRegister_Module } from './modules/recuritment/auth/register/recruitment_auth.module';
import { AuthRecuitmentLogin_Module } from './modules/recuritment/auth/login/login_recruitment.module';
import { RecruitmentCompany_Module } from './modules/recuritment/company/company_recruitment.module';

// Log environment variables to check if they are loaded correctly
console.log('DB Config:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
});

@Module({
        imports: [
                ConfigModule.forRoot({
                        isGlobal: true,
                        envFilePath: '.env',
                }),
                TypeOrmModule.forRoot({
                        type: 'mysql',
                        host: process.env.DB_HOST || '127.0.0.1',
                        port: parseInt(process.env.DB_PORT, 10) || 3306,
                        username: process.env.DB_USER || 'root',
                        password: process.env.DB_PASSWORD || '',
                        database: process.env.DB_NAME || 'jobmarket',
                        entities: [__dirname + '/**/*.entity{.ts,.js}'],
                        synchronize: false,
                }),
                JobModule,
                AuthModule,
                AuthUserModule,
                UserModule,
                FavoriteJobModule,
                AppliedJobModule,
                PayOSModule,
                OrderModule,

                //recruitment
                AuthReCuitmentRegister_Module,
                AuthRecuitmentLogin_Module,
                RecruitmentCompany_Module,
        ],
})
export class AppModule implements NestModule {
        configure(consumer: MiddlewareConsumer) {
                consumer.apply(AuthMiddleware).forRoutes(
                        { path: 'users/updateProfile', method: RequestMethod.PUT },
                        { path: 'users/deleteCV/:resumeCVId', method: RequestMethod.DELETE },
                        { path: 'users/setDefaultCV/:resumeCVId', method: RequestMethod.PUT },
                        { path: 'users/getUserId', method: RequestMethod.GET },
                        { path: 'users/update-email', method: RequestMethod.PUT },
                        { path: 'users/change-password', method: RequestMethod.PUT },
                        { path: 'users/deleteUserCurrent', method: RequestMethod.DELETE },

                        //favorite job
                        { path: 'favorite/favorite-job', method: RequestMethod.POST },
                        { path: 'favorite/user-favorites', method: RequestMethod.GET },
                        { path: 'favorite/removeFavorite-Job', method: RequestMethod.DELETE },

                        // AI
                        {
                                path: '/users/analyze-competitiveness/:orderId/:jobId/:resumeCVId',
                                method: RequestMethod.POST,
                        },

                        {
                                path: 'users/create-payment-link',
                                method: RequestMethod.POST,
                        },

                        // orrder
                        {
                                path: 'orders/user-orders',
                                method: RequestMethod.GET,
                        },

                        {
                                path: 'orders/:orderId/disable',
                                method: RequestMethod.PATCH,
                        },

                        //apply job
                        {
                                path: 'applied/apply-job',
                                method: RequestMethod.POST,
                        },

                        { path: 'applied/user-applied', method: RequestMethod.GET },

                        // ======================================= Recruitment =============================
                        { path: 'recruitment/getRecuitmentId', method: RequestMethod.GET }
                );
        }
}
