import { IsString, MinLength } from 'class-validator';

export class WpExchangeDto {
  @IsString()
  @MinLength(6)
  code!: string;
}
