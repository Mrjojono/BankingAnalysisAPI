import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @ApiProperty({
    example: 'joan@gmail.com',
    description: "Email de l'utilisateur",
  })
  @IsEmail()
  @Transform(({ value }) => value.toLowerCase())
  contact: string;

  @ApiProperty({
    example: 'motdepasse123',
    description: 'Mot de passe',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value.trim())
  password: string;
}
