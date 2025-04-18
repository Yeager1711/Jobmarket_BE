import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
        private transporter: nodemailer.Transporter;

        constructor(private configService: ConfigService) {
                this.transporter = nodemailer.createTransport({
                        host: this.configService.get<string>('EMAIL_HOST'),
                        port: this.configService.get<number>('EMAIL_PORT'),
                        secure: false, // true for 465, false for other ports
                        auth: {
                                user: this.configService.get<string>('EMAIL_USER'),
                                pass: this.configService.get<string>('EMAIL_PASS'),
                        },
                });
        }

        async sendRegistrationEmail(
                to: string,
                firstName: string,
                lastName: string,
                companyName: string
        ) {
                const mailOptions = {
                        from: `"Your Company" <${this.configService.get<string>('EMAIL_USER')}>`,
                        to,
                        subject: 'Đăng ký thành công',
                        html: `
                        <h2>Chào nhà tuyển dụng ${firstName} ${lastName},</h2>
                        <p>Cảm ơn bạn đã đăng ký tài khoản nhà tuyển dụng với công ty <strong>${companyName}</strong>.</p>
                        <p>Tài khoản của bạn đã được tạo thành công. Bạn có thể bắt đầu sử dụng hệ thống để đăng tin tuyển dụng.</p>
                        <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi qua email này.</p>
                        <p>Trân trọng,<br>Đội ngũ hỗ trợ JOBMARKET</p>
      `,
                };

                try {
                        await this.transporter.sendMail(mailOptions);
                        console.log(`Email đã được gửi tới ${to}`);
                } catch (error) {
                        console.error('Lỗi khi gửi email:', error);
                        throw new Error('Không thể gửi email xác nhận');
                }
        }
}
