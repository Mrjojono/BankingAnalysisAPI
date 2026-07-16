import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, IsDateString, IsIn } from 'class-validator';

export class CreateScheduledNotificationDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  title!: string;

  @ApiProperty()
  @IsString() @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({ default: 'ADMIN_BROADCAST' })
  @IsString() @IsOptional()
  type?: string;

  @ApiPropertyOptional({ default: 'INFO' })
  @IsString() @IsOptional()
  severity?: string;

  @ApiProperty()
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  recurrence?: string;

  @ApiPropertyOptional({ default: 'all' })
  @IsString() @IsOptional()
  @IsIn(['all', 'user_ids', 'customer_targets'])
  targetType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  targetIds?: string[];
}

export class UpdateScheduledNotificationDto {
  @ApiPropertyOptional()
  @IsString() @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  body?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  type?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  severity?: string;

  @ApiPropertyOptional()
  @IsDateString() @IsOptional()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  @IsIn(['DAILY', 'WEEKLY', 'MONTHLY'])
  recurrence?: string;

  @ApiPropertyOptional()
  @IsString() @IsOptional()
  @IsIn(['all', 'user_ids', 'customer_targets'])
  targetType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  targetIds?: string[];

  @ApiPropertyOptional()
  @IsBoolean() @IsOptional()
  active?: boolean;
}

export class PurgeNotificationsDto {
  @ApiPropertyOptional()
  @IsString() @IsOptional()
  type?: string;

  @ApiPropertyOptional()
  @IsDateString() @IsOptional()
  before?: string;
}
