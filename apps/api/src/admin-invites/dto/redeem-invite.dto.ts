import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RedeemInviteDto {
  @ApiProperty({ description: 'The invite token received in the redeem URL' })
  @IsString()
  @IsNotEmpty()
  token!: string;
}
