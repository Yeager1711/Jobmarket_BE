import { Controller, Post, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { ChatGptService } from './chat-GPT.service';

@Controller('chatGPT')
export class ChatGptController {
    constructor(private readonly chatGptService: ChatGptService) {}

    @Post('upload-cv')
    @UseInterceptors(FileInterceptor('file', { storage: multer.memoryStorage() }))
    async uploadCv(@UploadedFile() file: Express.Multer.File) {
        if (!file || !file.buffer) {
            return { message: 'Vui lòng tải lên một file PDF hợp lệ' };
        }

        console.log('✅ File nhận được:', file.originalname);
        const response = await this.chatGptService.parsePdf(file);
        return { message: 'Phân tích thành công', aiResponse: response };
    }
}
