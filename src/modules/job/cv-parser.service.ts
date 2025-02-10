import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';

@Injectable()
export class CvParserService {
      private openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      async extractInformation(cvText: string) {
            const prompt = `
            ## Yêu cầu:
            - Vị trí ứng tuyển (position)
            - Kinh nghiệm làm việc (experience) (ghi rõ số năm)
            - Kỹ năng chính (skills) (danh sách kỹ năng, tối đa 10 kỹ năng)
            - Mức lương mong muốn (salary_expectation) (đơn vị: VND)

            ## Dữ liệu CV:
            """
            ${cvText}
            """

            ## Định dạng đầu ra:
            {
            "position": "Tên vị trí ứng tuyển",
            "experience": "Số năm kinh nghiệm",
            "skills": ["Kỹ năng 1", "Kỹ năng 2", "Kỹ năng 3"],
            "salary_expectation": "Mức lương mong muốn"
            }

            Chỉ trả về JSON hợp lệ, không thêm bất kỳ nội dung nào khác.
            `;

            try {
                  // 🟢 Call OpenAI API 
                  const response = await this.openai.chat.completions.create({
                        model: 'gpt-4',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.5,
                  });

                  // 🟢 Make sure JSON is valid
                  return JSON.parse(response.choices[0]?.message?.content || '{}');
            } catch (error) {
                  console.error('Lỗi khi gọi OpenAI API hoặc parse JSON:', error);
                  return null;
            }
      }
}
