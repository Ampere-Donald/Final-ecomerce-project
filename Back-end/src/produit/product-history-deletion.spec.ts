import { ProduitService } from './produit.service';
import { ConflictException } from '@nestjs/common';

describe('Product with retained business/technical history', () => {
  it('returns an actionable conflict without deleting media or emitting a deletion event', async () => {
    const db: any = {
      produit: { delete: jest.fn().mockRejectedValue({ code: 'P2003' }) },
    };
    const notifications: any = { create: jest.fn() },
      images: any = { deleteByUrl: jest.fn() };
    const service = new ProduitService(db, notifications, images, {} as any);
    jest
      .spyOn(service, 'findOne')
      .mockResolvedValue({
        id: 'fixture',
        imageUrl: 'https://image.example/file',
      } as any);
    await expect(service.remove('fixture')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(images.deleteByUrl).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
  });
});
