import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET;
@Injectable()
export class AuthMiddleware implements NestMiddleware {
        use(req: Request, res: Response, next: NextFunction) {
                const token = req.headers.authorization?.split(' ')[1];
                console.log('access_token:', token);
                if (!token) {
                        console.log('❌ Không có token');
                        return res.status(401).json({ message: 'Unauthorized: No token provided' });
                }
                try {
                        const jwtSecret = process.env.JWT_SECRET || 'jobmarketJWTSECRET_KEYVALUES';
                        const decoded = jwt.verify(token, jwtSecret) as { userId: string };
                        // console.log('✅ Token hợp lệ:', decoded);
                        (req as any).user = decoded;
                        next();
                } catch (error) {
                        console.error('❌ Lỗi xác minh token:', error.message);
                        return res
                                .status(401)
                                .json({
                                        message: `Unauthorized: Invalid token - ${error.message}`,
                                });
                }
        }
}
