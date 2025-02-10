import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import * as pdfParse from 'pdf-parse';

@Injectable()
export class ChatGptService {
      private openai: OpenAI;

      constructor() {
            this.openai = new OpenAI({
                  apiKey: process.env.OPENAI_API_KEY || '', // Đảm bảo lấy từ biến môi trường
            });

            if (!process.env.OPENAI_API_KEY) {
                  console.error('⚠️ Thiếu API Key! Hãy kiểm tra .env');
                  throw new Error('OPENAI_API_KEY không được tìm thấy');
            }
      }

      async parsePdf(file: Express.Multer.File) {
            if (!file || !file.buffer) {
                  console.error('LỖI: Không nhận được file hoặc buffer trống', file);
                  throw new Error('File buffer is missing');
            }

            try {
                  console.log('📄 Đang phân tích CV:', file.originalname);
                  const pdfData = await pdfParse(file.buffer);
                  const text = pdfData.text.trim();

                  if (!text) {
                        throw new Error('Không thể trích xuất nội dung từ CV');
                  }

                  return await this.askOpenAI(text);
            } catch (error) {
                  console.error('❌ Lỗi phân tích PDF:', error.message);
                  throw new Error(`Lỗi phân tích PDF: ${error.message}`);
            }
      }

      async askOpenAI(content: string) {
            try {
                  console.log('🤖 Gửi nội dung CV đến OpenAI...');
                  const response = await this.openai.chat.completions.create({
                        model: 'gpt-3.5-turbo', // Hoặc 'gpt-3.5-turbo' nếu muốn rẻ hơn
                        messages: [
                              {
                                    role: 'system',
                                    content: 'Bạn là chuyên gia tuyển dụng. Hãy phân tích CV và đánh giá ứng viên.',
                              },
                              { role: 'user', content: content },
                        ],
                        temperature: 0.7,
                  });

                  if (!response.choices || response.choices.length === 0) {
                        throw new Error('OpenAI không trả về kết quả hợp lệ');
                  }

                  return response.choices[0].message.content;
            } catch (error) {
                  if (error.code === 'insufficient_quota') {
                        console.error(
                              '❌ Quota bị vượt quá: Bạn cần kiểm tra lại hạn mức API của mình.'
                        );
                        throw new Error(
                              'Quota API OpenAI đã vượt quá hạn mức. Vui lòng kiểm tra lại tài khoản.'
                        );
                  }
                  console.error('❌ Lỗi gọi OpenAI:', error.message);
                  throw new Error('Không thể lấy phản hồi từ OpenAI');
            }
      }
}
