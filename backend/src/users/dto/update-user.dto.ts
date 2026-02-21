import { IsString, IsOptional, IsEnum, IsBoolean, IsIn, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Role } from '../../common/enums/role.enum';

class UserSettingsDto {
  @IsOptional()
  @IsIn(['classic', 'modern'], { message: 'theme должен быть "classic" или "modern"' })
  theme?: 'classic' | 'modern';

  @IsOptional()
  @IsIn(['light', 'dark'], { message: 'colorMode должен быть "light" или "dark"' })
  colorMode?: 'light' | 'dark';

  @IsOptional()
  @IsString()
  parserDocsUrl?: string;

  @IsOptional()
  @IsString()
  proxyUrl?: string;

  @IsOptional()
  @IsString()
  aiUrl?: string;

  @IsOptional()
  @IsString()
  aiPrompt?: string;

  @IsOptional()
  @IsString()
  searchApiUrl?: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Иван' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Иванов' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+7 999 123 45 67' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role, { message: 'Некорректная роль' })
  role?: Role;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: { theme: 'modern', colorMode: 'dark' } })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserSettingsDto)
  settings?: UserSettingsDto;
}
