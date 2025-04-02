import {
        Controller,
        Post,
        Get,
        Body,
        Req,
        UnauthorizedException,
        BadRequestException,
} from '@nestjs/common';
import { AppliedJobService } from './applied_job.service';
import { Request } from 'express';
import { UserService } from '../auth/user/user.service';

@Controller('applied')
export class AppliedJobController {
        constructor(
                private readonly appliedJobService: AppliedJobService,
                private readonly userService: UserService
        ) {} 

        @Post('apply-job')
        async applyJob(
                @Req() req: Request,
                @Body() body: { jobId: number; resumeCVId: number; letter_introduction?: string }
        ) {
                const userId = (req as any).user?.userId;
                if (!userId) {
                        throw new UnauthorizedException(
                                'Không tìm thấy thông tin user trong token'
                        );
                }

                const { jobId, resumeCVId, letter_introduction } = body;

                if (!jobId) {
                        throw new BadRequestException('Thiếu JobId');
                }

                const resultApply = await this.userService.applyJob(
                        userId,
                        jobId,
                        resumeCVId,
                        letter_introduction
                );
                return {
                        message: 'Ứng tuyển công việc thành công',
                        data: resultApply,
                };
        }

        @Get('user-applied')
        async getUserFavoriteJobs(@Req() req: Request) {
                const userId = (req as any).user?.userId;
                if (!userId) {
                        throw new UnauthorizedException('Unauthorized: User ID missing');
                }
                const favorites = await this.appliedJobService.getUserAppliedJobs(userId);
                return { message: 'Danh sách công việc đã ứng tuyển', data: favorites };
        }
}
