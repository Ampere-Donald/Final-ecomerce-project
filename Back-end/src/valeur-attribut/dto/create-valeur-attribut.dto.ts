import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateValeurAttributDto {
  @IsUUID()
  attributId: string;

  @IsString()
  @MaxLength(100)
  valeur: string;
}
