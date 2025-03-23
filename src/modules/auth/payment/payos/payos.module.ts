import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from '../../../../entities/order.entity';
import { PayOSService } from './payos.service';
import { PayOSController } from './payos.controller';
import { UserModule } from '../../../../modules/auth/user/user.module'; // Import UserModule

@Module({
    imports: [
        TypeOrmModule.forFeature([Order]), // Cung cấp OrderRepository
        UserModule, // Cung cấp UserService
    ],
    providers: [PayOSService],
    controllers: [PayOSController, ],
    exports: [PayOSService], // Export PayOSService nếu cần dùng ở module khác
})
export class PayOSModule {}