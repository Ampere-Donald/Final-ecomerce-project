import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @Length(6, 6, { message: "Le code OTP doit contenir 6 chiffres" })
  code: string;
}
