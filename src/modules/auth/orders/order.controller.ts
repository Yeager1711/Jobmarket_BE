import { Controller, Get, Patch, Req, Param, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
        constructor(private readonly orderService: OrderService) {}

        @Get('user-orders')
        async getOrdersByUserId(@Req() req: Request) {
                const userId = (req as any).user?.userId; // Lấy userId từ token qua middleware
                if (!userId) {
                        throw new UnauthorizedException(
                                'Không tìm thấy thông tin user trong token'
                        );
                }
                return this.orderService.getOrdersByUserId(userId);
        }

        // New endpoint to disable an order
        @Patch(':orderId/disable')
        async disableOrder(@Param('orderId') orderId: number, @Req() req: Request) {
                const userId = (req as any).user?.userId; // Get userId from token
                if (!userId) {
                        throw new UnauthorizedException(
                                'Không tìm thấy thông tin user trong token'
                        );
                }
                await this.orderService.disableOrder(orderId, userId);
                return { message: `Đơn hàng ${orderId} đã được vô hiệu hóa thành công` };
        }
}
