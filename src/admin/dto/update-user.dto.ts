import { IsEnum, IsOptional } from 'class-validator';
import { Role, UserAccountStatus } from '../../../generated/prisma/client';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @ApiPropertyOptional({ enum: UserAccountStatus })
  @IsOptional()
  @IsEnum(UserAccountStatus)
  status?: UserAccountStatus;
}
