import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({
    description: "Identifiant de l'utilisateur",
    example: 'clx...',
  })
  @Expose()
  id: string;

  @ApiProperty({ description: 'Prénom', example: 'Joan' })
  @Expose()
  firstName: string;

  @ApiProperty({ description: 'Nom', example: 'Dupont' })
  @Expose()
  lastName: string;

  @ApiProperty({ description: 'Email', example: 'joan@gmail.com' })
  @Expose()
  email: string;

  @Exclude()
  password: string;
}
