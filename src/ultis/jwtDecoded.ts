import * as jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'jobmarketJWTSECRET_KEYVALUES'; 

export const decodeToken = (token: string): any => {
    try {
        const decoded = jwt.verify(token, SECRET_KEY); // Xác thực chữ ký của token
        return decoded;
    } catch (error) {
        throw new Error('Token không hợp lệ hoặc đã hết hạn: ' + error.message);
    }
};
