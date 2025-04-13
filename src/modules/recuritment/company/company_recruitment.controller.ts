import { Controller, Get, Req, Res, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { Recruitment_Company_Service } from './company_recruitment.service';

@Controller('recruitment')
export class Recruitment_CompanyController {
        constructor(private readonly recruitmentService: Recruitment_Company_Service) {}

        @Get('getRecuitmentId')
        async getUserId(@Req() req: Request, @Res() res: Response) {
                try {
                        const recruitmentId = (req as any).user?.recruitmentId;
                        console.log('recruitmentId từ req.user:', recruitmentId);

                        if (!recruitmentId) {
                                return res
                                        .status(HttpStatus.UNAUTHORIZED)
                                        .json({ message: 'Unauthorized' });
                        }

                        const recruitment =
                                await this.recruitmentService.getRecruitmentById(recruitmentId);
                        return res.status(HttpStatus.OK).json({ email_hr: recruitment.email_hr });
                } catch (error) {
                        console.error('Lỗi khi lấy dữ liệu recruitment:', error.message);
                        return res
                                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .json({ message: 'Error fetching user data' });
                }
        }
}
