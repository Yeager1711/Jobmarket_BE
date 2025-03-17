import {
        Controller,
        Post,
        Get,
        Body,
        Req,
        UnauthorizedException,
        BadRequestException,
} from '@nestjs/common';
import { FavoriteJobService } from './fv_job.service';
import { Request } from 'express';

@Controller('favorite')
export class FavoriteJobController {
        constructor(private readonly favoriteJobService: FavoriteJobService) {} // Sửa từ UserService thành FavoriteJobService

        @Post('favorite-job')
        async addFavoriteJob(@Req() req: Request, @Body() body: { jobId: number }) {
                const userId = (req as any).user?.userId;

                if (!userId) {
                        throw new UnauthorizedException('Unauthorized: User ID missing');
                }

                const { jobId } = body;
                if (!jobId) {
                        throw new BadRequestException('JobId không được truyền từ Body');
                }

                const result = await this.favoriteJobService.addFavoriteJob(userId, jobId);
                return { message: 'Đã thêm công việc vào danh sách yêu thích', data: result };
        }

        @Get('user-favorites') 
        async getUserFavoriteJobs(@Req() req: Request) {
                const userId = (req as any).user?.userId;
                if (!userId) {
                        throw new UnauthorizedException('Unauthorized: User ID missing');
                }
                const favorites = await this.favoriteJobService.getUserFavoriteJobs(userId);
                return { message: 'Danh sách công việc yêu thích', data: favorites };
        }
}
