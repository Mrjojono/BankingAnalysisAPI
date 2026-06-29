import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({
    description: "Identifiant de l'utilisateur",
    example: 'clx...',
  })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Email', example: 'joan@gmail.com' })
  @Expose()
  email: string;

  @ApiProperty({ description: 'Rôle', example: 'CLIENT' })
  @Expose()
  role: string;

  @ApiPropertyOptional({
    description: "Nom d'affichage",
    example: 'Joan Doe',
  })
  @Expose()
  username?: string;

  @Exclude()
  password: string;
}
