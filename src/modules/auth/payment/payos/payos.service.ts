import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../../../entities/order.entity';
import { UserService } from '../../../auth/user/user.service';
const PayOS = require('@payos/node');

@Injectable()
export class PayOSService {
        private payos: any;

        constructor(
                @InjectRepository(Order)
                private readonly orderRepository: Repository<Order>,
                private readonly userService: UserService
        ) {
                this.payos = new PayOS(
                        process.env.PAYOS_CLIENT_ID,
                        process.env.PAYOS_API_KEY,
                        process.env.PAYOS_CHECKSUM_KEY
                );
        }

        async createPaymentLink(
                userId: number,
                jobId: number,
                resumeId: number,
                totalAmount: number,
                disable: number
        ) {
                try {
                        console.log('Received disable value:', disable, typeof disable);
                        if (!userId || !jobId || !resumeId || !totalAmount) {
                                console.error('Invalid input data:', {
                                        userId,
                                        jobId,
                                        resumeId,
                                        totalAmount,
                                });
                                throw new BadRequestException(
                                        'Missing required information for payment link creation'
                                );
                        }

                        const orderCode = Date.now(); // Là số
                        console.log('Generated orderCode:', orderCode);

                        const user = await this.userService.getUserById(userId);
                        if (!user || !user.email) {
                                console.error('User or email not found:', user);
                                throw new BadRequestException('User or email not found');
                        }

                        const description = `AI Analytics #${jobId}`;
                        if (description.length > 25) {
                                throw new BadRequestException('Description exceeds 25 characters');
                        }

                        // Gán orderCode vào orderId khi tạo order
                        const order = this.orderRepository.create({
                                orderId: orderCode, // Gán orderCode vào orderId
                                userId,
                                jobId,
                                resumeId,
                                totalAmount,
                                orderCode: orderCode.toString(), // Lưu orderCode dưới dạng string nếu cần
                                status: 'PENDING',
                                disable: disable === 0 ? false : true,
                                created_at: new Date(),
                        });
                        const savedOrder = await this.orderRepository.save(order);
                        console.log('Order saved:', savedOrder);
                        console.log('Saved order disable value:', savedOrder.disable);

                        const paymentData = {
                                orderCode: orderCode, // PayOS yêu cầu orderCode là số
                                amount: totalAmount,
                                description: description,
                                returnUrl: `http://localhost:3000/Auth/User/chatAI/result/payment/success?orderId=${savedOrder.orderId}&jobId=${jobId}&resumeCVId=${resumeId}`,
                                cancelUrl: 'http://localhost:3000/payment/cancel',
                                buyerEmail: user.email,
                                items: [
                                        {
                                                name: `AI Analytics #${jobId}`,
                                                quantity: 1,
                                                price: totalAmount,
                                        },
                                ],
                        };
                        console.log('Payment data:', paymentData);

                        const paymentLinkResponse = await this.payos.createPaymentLink(paymentData);
                        console.log('Payment link response:', paymentLinkResponse);

                        setTimeout(
                                async () => {
                                        await this.checkPaymentStatus(orderCode.toString());
                                },
                                10 * 60 * 1000
                        );

                        return {
                                checkoutUrl: paymentLinkResponse.checkoutUrl,
                                orderCode: paymentLinkResponse.orderCode,
                                orderId: savedOrder.orderId,
                        };
                } catch (error) {
                        console.error('Error creating payment link:', error.message, error.stack);
                        if (error.response && error.response.data) {
                                console.error('PayOS response error:', error.response.data);
                                throw new BadRequestException(
                                        error.response.data.message ||
                                                'Unable to create payment link due to PayOS error'
                                );
                        }
                        throw new BadRequestException(
                                error.message || 'Unable to create payment link'
                        );
                }
        }

        async handleWebhook(webhookData: any) {
                try {
                        console.log('Webhook data received:', JSON.stringify(webhookData, null, 2));

                        const isValid = this.payos.verifyPaymentWebhookData(webhookData);
                        if (!isValid) {
                                console.error('Invalid webhook signature');
                                return { success: false, message: 'Invalid webhook signature' };
                        }

                        const { orderCode, status, description, amount, code, desc } =
                                webhookData.data;
                        const orderCodeStr = orderCode.toString();
                        console.log(
                                `Processing webhook for orderCode: ${orderCodeStr}, status: ${status}, amount: ${amount}, description: ${description}, code: ${code}, desc: ${desc}`
                        );

                        const order = await this.orderRepository.findOne({
                                where: { orderCode: orderCodeStr },
                        });
                        if (!order) {
                                console.error(`Order with orderCode ${orderCodeStr} not found`);
                                return {
                                        success: false,
                                        message: `Order ${orderCodeStr} not found`,
                                };
                        }

                        if (order.status === 'PENDING') {
                                // Ưu tiên kiểm tra status nếu có
                                if (status) {
                                        if (status === 'PAID') {
                                                order.status = 'COMPLETED';
                                        } else if (status === 'CANCELLED') {
                                                order.status = 'CANCELLED';
                                        } else {
                                                console.log(
                                                        `Webhook status ${status} not handled, keeping PENDING`
                                                );
                                                return {
                                                        success: true,
                                                        message: `Order ${orderCodeStr} remains PENDING`,
                                                };
                                        }
                                } else {
                                        // Nếu không có status, dựa vào code và desc
                                        if (code === '00' && desc.toLowerCase() === 'success') {
                                                order.status = 'COMPLETED';
                                        } else {
                                                console.log(
                                                        `Webhook code ${code} and desc ${desc} not handled, keeping PENDING`
                                                );
                                                return {
                                                        success: true,
                                                        message: `Order ${orderCodeStr} remains PENDING`,
                                                };
                                        }
                                }
                                await this.orderRepository.save(order);
                                console.log(`Order ${orderCodeStr} updated to ${order.status}`);
                        }

                        return {
                                success: true,
                                message: `Order ${orderCodeStr} status updated successfully`,
                        };
                } catch (error) {
                        console.error('Webhook processing error:', error.message, error.stack);
                        return { success: false, message: 'Unable to process webhook' };
                }
        }

        async checkPaymentStatus(orderCode: string) {
                try {
                        const paymentInfo = await this.payos.getPaymentLinkInformation(orderCode);
                        console.log('Payment info:', paymentInfo);

                        const order = await this.orderRepository.findOne({
                                where: { orderCode },
                        });
                        if (!order) {
                                console.error(`Order with orderCode ${orderCode} not found`);
                                throw new Error('Order not found');
                        }

                        if (order.status === 'PENDING') {
                                if (
                                        paymentInfo.status === 'EXPIRED' ||
                                        paymentInfo.status === 'CANCELLED'
                                ) {
                                        order.status = 'CANCELLED';
                                        await this.orderRepository.save(order);
                                        console.log(
                                                `Order ${orderCode} cancelled due to expiration`
                                        );
                                } else if (paymentInfo.status === 'PAID') {
                                        order.status = 'COMPLETED';
                                        await this.orderRepository.save(order);
                                        console.log(`Order ${orderCode} completed`);
                                }
                        }

                        return order;
                } catch (error) {
                        console.error('Error checking payment status:', error.message, error.stack);
                        throw new BadRequestException('Unable to check payment status');
                }
        }
}
