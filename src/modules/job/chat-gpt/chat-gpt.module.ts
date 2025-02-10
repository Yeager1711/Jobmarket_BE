import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ChatGptService } from './chat-GPT.service';
import { ChatGptController } from './chat-GPT.controller';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads', // Lưu file tạm thời
    }),
  ],
  controllers: [ChatGptController],
  providers: [ChatGptService],
})
export class ChatGptModule {}
