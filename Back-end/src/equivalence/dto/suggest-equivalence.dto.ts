import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class SuggestEquivalenceDto {
  /** Recherche en texte libre (ex. "condensateur 12µF 450V"). */
  @IsOptional()
  @IsString()
  @MaxLength(255)
  query?: string;

  /** Produit ciblé (rupture) dont on cherche un équivalent. */
  @IsOptional()
  @IsUUID()
  produitId?: string;

  /** Origine de la demande (POS boutique ou site e-commerce). */
  @IsOptional()
  @IsIn(['pos', 'ecommerce'])
  source?: 'pos' | 'ecommerce';

  /** Vendeur à l'origine (facultatif, endpoint public). */
  @IsOptional()
  @IsUUID()
  vendeurId?: string;
}
