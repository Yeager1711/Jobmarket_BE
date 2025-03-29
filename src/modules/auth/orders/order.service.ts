import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../../entities/order.entity';

@Injectable()
export class OrderService {
        constructor(
                @InjectRepository(Order)
                private readonly orderRepository: Repository<Order>
        ) {}

        async getOrdersByUserId(userId: number): Promise<any[]> {
                const orders = await this.orderRepository.find({
                        where: { userId },
                        relations: ['job'],
                        order: { created_at: 'DESC' },
                });

                if (!orders || orders.length === 0) {
                        throw new NotFoundException(
                                'Không tìm thấy đơn hàng nào cho người dùng này'
                        );
                }

                const mappedOrders = orders
                        .map((order) => {
                                if (!order.job) {
                                        console.warn(
                                                `Order ${order.orderId} skipped: No related job information found`
                                        );
                                        return null;
                                }

                                let orderStatus = 'Không xác định';
                                switch (order.status) {
                                        case 'COMPLETED':
                                                orderStatus = 'Đã thanh toán';
                                                break;
                                        case 'CANCELLED':
                                                orderStatus = 'Đã hủy';
                                                break;
                                        case 'PENDING':
                                                orderStatus = 'Chờ thanh toán';
                                                break;
                                }

                                const purchaseDate = order.created_at.toLocaleString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        second: '2-digit',
                                        hour12: false,
                                });

                                return {
                                        orderId: order.orderId,
                                        jobId: order.job.jobId,
                                        resumeCvId: order.resumeId,
                                        userId: order.userId,
                                        purchaseDate,
                                        action: 'Analytics AI',
                                        orderCode: order.orderCode,
                                        disable: order.disable,
                                        orderDetails: {
                                                position: `${order.job.title} (ID: ${order.job.jobId})`,
                                                quantity: 1,
                                                analyze_text: order.analyze_text,
                                                totalAmount: order.totalAmount,
                                                status: orderStatus,
                                                created_at: purchaseDate,
                                        },
                                };
                        })
                        .filter((order): order is any => order !== null);

                if (mappedOrders.length === 0) {
                        throw new NotFoundException(
                                'Không tìm thấy đơn hàng hợp lệ nào cho người dùng này'
                        );
                }

                return mappedOrders;
        }

        async disableOrder(orderId: number, userId: number): Promise<void> {
                const order = await this.orderRepository.findOne({
                        where: { orderId, userId },
                });

                if (!order) {
                        throw new NotFoundException(
                                `Không tìm thấy đơn hàng với orderId: ${orderId}`
                        );
                }

                order.disable = true;
                await this.orderRepository.save(order);
        }
}
