import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([(req) => req.cookies?.token]),
            secretOrKey: process.env.JWT_SECRET || 'your_secret_key',
        });
    }

    async validate(payload: any) {
        return { userId: payload.userId, email: payload.email };
    }
}
