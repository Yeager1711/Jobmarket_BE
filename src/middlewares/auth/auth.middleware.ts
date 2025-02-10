import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
    constructor(private readonly jwtService: JwtService) {}

    use(req: Request, res: Response, next: NextFunction) {
        const token = req.cookies?.token;
        if (!token) throw new UnauthorizedException('Không có token');

        try {
            req.user = this.jwtService.verify(token);
            next();
        } catch (error) {
            throw new UnauthorizedException('Token không hợp lệ');
        }
    }
}
