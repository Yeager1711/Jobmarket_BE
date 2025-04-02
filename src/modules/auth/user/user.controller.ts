import {
        Controller,
        Param,
        Post,
        Get,
        Put,
        Body,
        Query,
        Delete,
        Res,
        Req,
        UploadedFile,
        UseInterceptors,
        BadRequestException,
        HttpException,
        HttpStatus,
        UnauthorizedException,
        ConflictException,
        NotFoundException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { Request, Response } from 'express';
import { AuthMiddleware } from '../../../middlewares/auth/auth.middleware';
import { PayOSService } from '../payment/payos/payos.service';

@Controller('users')
export class UserController {
        constructor(
                private readonly userService: UserService,
                private readonly payosService: PayOSService
        ) {}

        @Get('getUserId')
        async getUserbyId(@Req() req: Request) {
                const userId = (req as any).user?.userId; // Lấy userId từ access_token
                if (!userId) {
                        throw new UnauthorizedException(
                                'Không tìm thấy thông tin user trong token'
                        );
                }
                return this.userService.getUserById(userId);
        }

        @Post(':userId/upload-cv')
        @UseInterceptors(
                FileInterceptor('file', {
                        storage: diskStorage({
                                destination: (req, file, cb) => {
                                        const uploadDir = path.join(process.cwd(), 'uploads/cvs');
                                        cb(null, uploadDir);
                                },
                                filename: (req, file, cb) => {
                                        const uniqueSuffix =
                                                Date.now() + '-' + Math.round(Math.random() * 1e9);
                                        cb(
                                                null,
                                                `${uniqueSuffix}${path.extname(file.originalname)}`
                                        );
                                },
                        }),
                        fileFilter: (req, file, cb) => {
                                // Chỉ cho phép các định dạng file cụ thể
                                const allowedTypes = ['.pdf', '.doc', '.docx'];
                                const extname = path.extname(file.originalname).toLowerCase();
                                if (allowedTypes.includes(extname)) {
                                        cb(null, true);
                                } else {
                                        cb(
                                                new BadRequestException(
                                                        'Chỉ hỗ trợ file PDF, DOC, DOCX'
                                                ),
                                                false
                                        );
                                }
                        },
                })
        )
        async uploadCV(@Param('userId') userId: string, @UploadedFile() file: Express.Multer.File) {
                if (!file) {
                        throw new BadRequestException('No file uploaded');
                }

                const resume = await this.userService.uploadResume(parseInt(userId), file);
                return {
                        message: 'Upload CV thành công',
                        data: resume,
                };
        }

        @Get('getCv/:userId')
        async getCVbyUserId(@Param('userId') userId: number) {
                return this.userService.getCVByUserId(userId);
        }

        @Put('setDefaultCV/:resumeCVId')
        async setDefaultCv(@Param('resumeCVId') resumeCVId: number, @Req() req: Request) {
                const userId = (req as any).user?.userId;
                if (!userId) {
                        throw new UnauthorizedException(
                                'Không tìm thấy thông tin user trong token'
                        );
                }
                const message = await this.userService.setDefaultCv(resumeCVId, userId);
                return { message }; // Trả về object JSON
        }

        @Delete('deleteCV/:resumeCVId')
        async deleteCV(@Param('resumeCVId') resumeCVId: number, @Req() req: Request) {
                const userId = (req as any).user?.userId;
                if (!userId) {
                        throw new UnauthorizedException(
                                'Không tìm thấy thông tin user trong token'
                        );
                }
                return this.userService.deleteCV(userId, resumeCVId);
        }
        // Upload Image
        @Post(':userId/upload-image')
        @UseInterceptors(
                FileInterceptor('file', {
                        storage: diskStorage({
                                destination: './uploads/images', // Thư mục lưu trữ ảnh đại diện
                                filename: (req, file, cb) => {
                                        const uniqueSuffix =
                                                Date.now() + '-' + Math.round(Math.random() * 1e9);
                                        cb(
                                                null,
                                                `${uniqueSuffix}${path.extname(file.originalname)}`
                                        );
                                },
                        }),
                })
        )
        async uploadImage(
                @Param('userId') userId: number,
                @UploadedFile() file: Express.Multer.File
        ) {
                if (!file) {
                        throw new BadRequestException('File không hợp lệ');
                }

                return this.userService.uploadImage(userId, file.filename);
        }

        @Put('updateProfile')
        async updateProfile(@Req() req: Request, @Res() res: Response, @Body() body: any) {
                const userId = (req as any).user?.userId;
                console.log('userId', userId);

                if (!userId) {
                        return res.status(HttpStatus.UNAUTHORIZED).json({
                                message: 'Unauthorized: User ID missing',
                        });
                }

                try {
                        const updatedUser = await this.userService.updateUserProfile(userId, body);
                        return res.status(HttpStatus.OK).json({
                                message: 'Cập nhật hồ sơ thành công!',
                                user: updatedUser,
                        });
                } catch (error) {
                        console.error('Lỗi cập nhật hồ sơ:', error);

                        // Nếu lỗi là ConflictException (số điện thoại đã tồn tại)
                        if (error.status === HttpStatus.CONFLICT) {
                                return res.status(HttpStatus.CONFLICT).json({
                                        message: 'Số điện thoại đã được sử dụng bởi người dùng khác',
                                });
                        }

                        // Nếu lỗi khác, trả về 500
                        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                                message: 'Lỗi server',
                        });
                }
        }

        @Put('update-email')
        async updateEmail(
                @Req() req: Request,
                @Body() body: { newEmail: string; currentPassword: string }
        ) {
                const userId = (req as any).user?.userId;
                if (!userId) {
                        throw new UnauthorizedException('Unauthorized: User ID missing');
                }

                const { newEmail, currentPassword } = body;
                if (!newEmail || !currentPassword) {
                        throw new BadRequestException(
                                'Vui lòng cung cấp email mới và mật khẩu hiện tại'
                        );
                }

                const updatedUser = await this.userService.updateEmail(
                        userId,
                        newEmail,
                        currentPassword
                );
                return {
                        message: 'Cập nhật email thành công',
                        user: updatedUser,
                };
        }

        @Put('change-password')
        async changePassword(
                @Req() req: Request,
                @Body() body: { currentPassword: string; newPassword: string }
        ) {
                const userId = (req as any).user?.userId;
                if (!userId) {
                        throw new UnauthorizedException('Unauthorized: User ID missing');
                }

                const { newPassword, currentPassword } = body;
                if (!newPassword || !currentPassword) {
                        throw new BadRequestException(
                                'Vui lòng cung cấp mật khẩu cũ hoặc mật khẩu mới'
                        );
                }

                const changePaswword = await this.userService.changePassword(
                        userId,
                        newPassword,
                        currentPassword
                );

                return {
                        message: 'Thay đổi mật khẩu thành công',
                        user: changePaswword,
                };
        }

        //Chức năng xóa tài khoản
        @Delete('deleteUserCurrent')
        async deleteUser(@Req() req: Request, @Res() res: Response) {
                const userId = (req as any).user?.userId;
                console.log('userIDDĐ:', userId);
                if (!userId) {
                        throw new UnauthorizedException(
                                'Không tìm thấy thông tin user trong token'
                        );
                }

                try {
                        await this.userService.deleteUserCurrent(userId);
                        return res.status(HttpStatus.OK).json({
                                message: 'Tài khoản và tất cả dữ liệu liên quan đã được xóa thành công',
                        });
                } catch (error) {
                        console.error('Lỗi khi xóa tài khoản:', error);
                        return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
                                message: 'Lỗi server khi xóa tài khoản',
                        });
                }
        }

        // API mới để phân tích mức độ cạnh tranh
        @Post('analyze-competitiveness/:orderId/:jobId/:resumeCVId')
        async analyzeCompetitiveness(
                @Param('orderId') orderId: number,
                @Param('jobId') jobId: number,
                @Param('resumeCVId') resumeCVId: number,
                @Req() req: Request
        ) {
                console.log(
                        `[analyzeCompetitiveness] Received request: orderId=${orderId}, jobId=${jobId}, resumeCVId=${resumeCVId}`
                );
                const authUserId = (req as any).user?.userId;
                if (!authUserId) {
                        throw new UnauthorizedException('Unauthorized: User ID missing in token');
                }

                if (!orderId || orderId <= 0) {
                        throw new BadRequestException('Order ID không hợp lệ hoặc thiếu');
                }

                const result = await this.userService.analyzeCompetitiveness(
                        authUserId,
                        jobId,
                        resumeCVId,
                        orderId
                );
                return {
                        message: 'Phân tích mức độ cạnh tranh thành công',
                        data: result,
                };
        }

        // API thanh toán Payos
        @Post('create-payment-link')
        async createPaymentLink(@Req() req: Request, @Body() body: any) {
                const userId = (req as any).user?.userId;
                if (!userId) {
                        throw new UnauthorizedException(
                                'Không tìm thấy thông tin user trong token'
                        );
                }

                const { jobId, resumeCVId, totalAmount, disable } = body;
                if (!jobId || !resumeCVId || !totalAmount) {
                        throw new BadRequestException(
                                'Thiếu các trường bắt buộc: jobId, resumeCVId, totalAmount'
                        );
                }

                // Truyền toàn bộ body vào PayOSService để đảm bảo disable không bị bỏ qua
                return this.payosService.createPaymentLink(
                        userId,
                        jobId,
                        resumeCVId,
                        totalAmount,
                        disable
                );
        }

        //Apply Job
        // @Post('apply-job')
        // async applyJob(
        //         @Req() req: Request,
        //         @Body() body: { jobId: number; resumeCVId: number; letter_introduction?: string }
        // ) {
        //         const userId = (req as any).user?.userId;
        //         if (!userId) {
        //                 throw new UnauthorizedException(
        //                         'Không tìm thấy thông tin user trong token'
        //                 );
        //         }

        //         const { jobId, resumeCVId, letter_introduction } = body;

        //         if (!jobId) {
        //                 throw new BadRequestException('Thiếu JobId');
        //         }

        //         const resultApply = await this.userService.applyJob(
        //                 userId,
        //                 jobId,
        //                 resumeCVId,
        //                 letter_introduction
        //         );
        //         return {
        //                 message: 'Ứng tuyển công việc thành công',
        //                 data: resultApply,
        //         };
        // }
}
