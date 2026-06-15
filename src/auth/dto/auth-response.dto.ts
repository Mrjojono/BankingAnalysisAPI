import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ description: 'Étape actuelle du flux', example: 'verify_otp' })
  step: string;

  @ApiProperty({
    description: 'Message informatif',
    example: 'Code OTP envoyé.',
  })
  message: string;

  @ApiPropertyOptional({
    description: 'Token JWT (uniquement à la fin du flux)',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  token?: string;
}

export class LoginResponseDto {
  @ApiProperty({ description: 'Token JWT', example: 'eyJhbGciOiJIUzI1NiIs...' })
  token: string;
}

export class MessageResponseDto {
  @ApiProperty({ description: 'Message', example: 'Nouveau code OTP envoyé.' })
  message: string;
}
