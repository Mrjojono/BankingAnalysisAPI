import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class RegisterPushTokenDto {
  @ApiProperty({ description: 'Token push Expo/FCM' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({ description: 'Plateforme', example: 'ios' })
  @IsString()
  @IsOptional()
  @IsIn(['ios', 'android', 'web'])
  platform?: string;
}

export class UnregisterPushTokenDto {
  @ApiProperty({ description: 'Token push à désinscrire' })
  @IsString()
  @IsNotEmpty()
  token: string;
}
