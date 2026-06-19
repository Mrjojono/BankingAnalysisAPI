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
  @ApiProperty({
    description: "Token d'accès JWT",
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token de rafraîchissement JWT',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Informations utilisateur',
    example: {
      id: 'clx...',
      email: 'user@example.com',
      role: 'ADMIN',
      username: 'Joan Doe',
    },
  })
  user: { id: string; email: string; role: string; username?: string };
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Token de rafraîchissement',
    example: 'eyJhbGciOiJIUzI1NiIs...',
  })
  refreshToken: string;
}

export class RefreshResponseDto {
  @ApiProperty({ description: 'Nouveau token accès JWT' })
  accessToken: string;

  @ApiProperty({ description: 'Nouveau token de rafraîchissement JWT' })
  refreshToken: string;
}

export class MeResponseDto {
  @ApiProperty({
    description: "Identifiant de l'utilisateur",
    example: 'clx...',
  })
  id: string;

  @ApiProperty({ description: 'Email', example: 'user@example.com' })
  email: string;

  @ApiProperty({ description: 'Rôle utilisateur', example: 'ADMIN' })
  role: string;

  @ApiPropertyOptional({
    description: "Nom d'affichage (prénom + nom)",
    example: 'Joan Doe',
  })
  username?: string;
}

export class MessageResponseDto {
  @ApiProperty({ description: 'Message', example: 'Nouveau code OTP envoyé.' })
  message: string;
}
