import {
      Controller,
      Param,
      Post,
      Get,
      Body,
      UploadedFile,
      UseInterceptors,
      BadRequestException,
} from '@nestjs/common';
import { UserService } from './user.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';

@Controller('users')
export class UserController {
      constructor(private readonly userService: UserService) {}

      @Get(':userId')
      async getUserbyId(@Param('userId') userId: number) {
            return this.userService.getUserById(userId);
      }

      @Post(':userId/upload-cv')
      @UseInterceptors(
            FileInterceptor('file', {
                  storage: diskStorage({
                        destination: './uploads/cvs', // Thư mục lưu trữ file
                        filename: (req, file, cb) => {
                              const uniqueSuffix =
                                    Date.now() + '-' + Math.round(Math.random() * 1e9);
                              cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
                        },
                  }),
            })
      )
      async uploadCV(
            @Param('userId') userId: number,
            @UploadedFile() file: Express.Multer.File,
            @Body() body: { fileName: string } // Nhận `fileName` từ request body
      ) {
            if (!file || !body.fileName) {
                  throw new BadRequestException('File hoặc tên file không hợp lệ');
            }

            return this.userService.uploadResume(userId, body.fileName, file.filename);
      }

      @Get('getCv/:userId')
      async getCVbyUserId(@Param('userId') userId: number) {
            return this.userService.getCVByUserId(userId);
      }
}
