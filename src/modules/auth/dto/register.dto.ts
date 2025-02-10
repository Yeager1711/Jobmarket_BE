import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
export class RegisterDto {
    @IsNotEmpty()
    username: string;
  
    @IsEmail()
    email: string;
  
    @IsNotEmpty()
    @MinLength(6)
    password: string;
  
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    address?: string;
  }