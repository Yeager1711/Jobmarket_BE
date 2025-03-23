import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { PayOSService } from './payos.service';

@Controller('webhook')
export class PayOSController {
        constructor(private readonly payosService: PayOSService) {}

        @Post('payos')
        async handlePayOSWebhook(@Body() webhookData: any) {
                const result = await this.payosService.handleWebhook(webhookData);
                return result; // Luôn trả về 200 với body JSON
        }
}
