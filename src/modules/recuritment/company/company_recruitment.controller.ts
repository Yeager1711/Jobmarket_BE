// recruitment_company.controller.ts
import {
        Controller,
        Get,
        Patch,
        Req,
        Res,
        HttpStatus,
        UseInterceptors,
        UploadedFile,
        Param,
        Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { Recruitment_Company_Service } from './company_recruitment.service';
import { diskStorage } from 'multer';
import { extname } from 'path';

@Controller('recruitment')
export class Recruitment_CompanyController {
        constructor(private readonly recruitmentService: Recruitment_Company_Service) {}

        @Get('getRecruitmentId')
        async getRecruitmentById(@Req() req: Request, @Res() res: Response) {
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
                        return res.status(HttpStatus.OK).json(recruitment);
                } catch (error) {
                        console.error('Lỗi khi lấy dữ liệu recruitment:', error.message);
                        return res
                                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .json({ message: 'Error fetching recruitment data' });
                }
        }

        @Get('company/:companyId/jobs')
        async getJobsByCompanyId(
                @Req() req: Request,
                @Param('companyId') companyId: string,
                @Res() res: Response
        ) {
                try {
                        const recruitmentId = (req as any).user?.recruitmentId;

                        if (!recruitmentId) {
                                return res
                                        .status(HttpStatus.UNAUTHORIZED)
                                        .json({ message: 'Unauthorized' });
                        }

                        const jobs = await this.recruitmentService.getCompanyId(
                                recruitmentId,
                                +companyId // Convert string to number
                        );
                        return res.status(HttpStatus.OK).json(jobs);
                } catch (error) {
                        console.error('Lỗi khi lấy danh sách job:', error.message);
                        return res
                                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                                .json({ message: 'Error fetching jobs data' });
                }
        }

        @Patch('updateBannerBackground')
        @UseInterceptors(
                FileInterceptor('bannerImage', {
                        storage: diskStorage({
                                destination: './uploads/companyBanners',
                                filename: (req, file, cb) => {
                                        const uniqueSuffix =
                                                Date.now() + '-' + Math.round(Math.random() * 1e9);
                                        const ext = extname(file.originalname);
                                        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
                                },
                        }),
                        fileFilter: (req, file, cb) => {
                                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
                                if (!allowedTypes.includes(file.mimetype)) {
                                        return cb(
                                                new Error(
                                                        'Only JPEG, PNG, and GIF files are allowed'
                                                ),
                                                false
                                        );
                                }
                                cb(null, true);
                        },
                })
        )
        async updateBannerBackground(
                @Req() req: Request,
                @Res() res: Response,
                @UploadedFile() file: Express.Multer.File
        ) {
                try {
                        const recruitmentId = (req as any).user?.recruitmentId;

                        if (!recruitmentId) {
                                return res
                                        .status(HttpStatus.UNAUTHORIZED)
                                        .json({ message: 'Unauthorized' });
                        }

                        if (!file) {
                                return res
                                        .status(HttpStatus.BAD_REQUEST)
                                        .json({ message: 'No file uploaded' });
                        }

                        const bannerUrl = `/uploads/companyBanners/${file.filename}`;
                        const updatedImage = await this.recruitmentService.updateBannerBackground(
                                recruitmentId,
                                bannerUrl
                        );

                        return res.status(HttpStatus.OK).json({
                                message: 'Banner background updated successfully',
                                banner_BackgroundImage_company:
                                        updatedImage.banner_BackgroundImage_company,
                        });
                } catch (error) {
                        console.error('Lỗi khi cập nhật banner background:', error.message);
                        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                                message: 'Error updating banner background',
                        });
                }
        }

        @Patch('updateCompanyLogo')
        @UseInterceptors(
                FileInterceptor('logoImage', {
                        storage: diskStorage({
                                destination: './uploads/companyLogos',
                                filename: (req, file, cb) => {
                                        const uniqueSuffix =
                                                Date.now() + '-' + Math.round(Math.random() * 1e9);
                                        const ext = extname(file.originalname);
                                        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
                                },
                        }),
                        fileFilter: (req, file, cb) => {
                                const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
                                if (!allowedTypes.includes(file.mimetype)) {
                                        return cb(
                                                new Error(
                                                        'Only JPEG, PNG, and GIF files are allowed'
                                                ),
                                                false
                                        );
                                }
                                cb(null, true);
                        },
                })
        )
        async updateCompanyLogo(
                @Req() req: Request,
                @Res() res: Response,
                @UploadedFile() file: Express.Multer.File
        ) {
                try {
                        const recruitmentId = (req as any).user?.recruitmentId;

                        if (!recruitmentId) {
                                return res
                                        .status(HttpStatus.UNAUTHORIZED)
                                        .json({ message: 'Unauthorized' });
                        }

                        if (!file) {
                                return res
                                        .status(HttpStatus.BAD_REQUEST)
                                        .json({ message: 'No file uploaded' });
                        }

                        const logoUrl = `/Uploads/companyLogos/${file.filename}`;
                        const updatedImage = await this.recruitmentService.updateCompanyLogo(
                                recruitmentId,
                                logoUrl
                        );

                        return res.status(HttpStatus.OK).json({
                                message: 'Company logo updated successfully',
                                image_company: updatedImage.image_company,
                        });
                } catch (error) {
                        console.error('Error updating company logo:', error.message);
                        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                                message: 'Error updating company logo',
                        });
                }
        }

        @Patch('updateCompanyInfo')
        async updateCompanyInfo(
                @Req() req: Request,
                @Res() res: Response,
                @Body()
                updateData: {
                        name_company?: string;
                        phoneNumber_company?: string;
                        company_description?: string;
                        industries?: string[];
                        address_name?: string;
                        companyTaxIdentificationNumber?: string;
                        companySize?: string;
                        personalTaxCode?: string;
                }
        ) {
                try {
                        const recruitmentId = (req as any).user?.recruitmentId;

                        if (!recruitmentId) {
                                return res
                                        .status(HttpStatus.UNAUTHORIZED)
                                        .json({ message: 'Unauthorized' });
                        }

                        const updatedCompany = await this.recruitmentService.updateCompanyInfo(
                                recruitmentId,
                                updateData
                        );

                        return res.status(HttpStatus.OK).json({
                                message: 'Company information updated successfully',
                                company: updatedCompany,
                        });
                } catch (error) {
                        console.error('Error updating company information:', error.message);
                        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                                message: 'Error updating company information',
                        });
                }
        }
}
