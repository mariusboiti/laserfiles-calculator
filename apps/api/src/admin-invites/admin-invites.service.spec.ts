import { Test, TestingModule } from '@nestjs/testing';
import { AdminInvitesService } from './admin-invites.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';

describe('AdminInvitesService', () => {
  let service: AdminInvitesService;
  let prisma: jest.Mocked<PrismaService>;

  const mockPrismaService = {
    adminInvite: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    userEntitlement: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminInvitesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AdminInvitesService>(AdminInvitesService);
    prisma = module.get(PrismaService);

    jest.clearAllMocks();
  });

  describe('createInvite', () => {
    it('should create an invite with default values', async () => {
      const dto = { email: 'test@example.com' };
      const createdByUserId = 'admin-user-id';

      mockPrismaService.adminInvite.create.mockResolvedValue({
        id: 'invite-id',
        email: 'test@example.com',
        tokenHash: 'hash',
        tokenLast4: 'abcd',
        creditsGrant: 200,
        durationDays: 30,
        expiresAt: new Date(),
      });

      const result = await service.createInvite(dto, createdByUserId);

      expect(result).toHaveProperty('inviteId');
      expect(result).toHaveProperty('redeemUrl');
      expect(result.email).toBe('test@example.com');
      expect(result.creditsGrant).toBe(200);
      expect(result.durationDays).toBe(30);
    });

    it('should normalize email to lowercase', async () => {
      const dto = { email: 'TEST@EXAMPLE.COM' };
      const createdByUserId = 'admin-user-id';

      mockPrismaService.adminInvite.create.mockResolvedValue({
        id: 'invite-id',
        email: 'test@example.com',
        tokenHash: 'hash',
        tokenLast4: 'abcd',
        creditsGrant: 200,
        durationDays: 30,
        expiresAt: new Date(),
      });

      await service.createInvite(dto, createdByUserId);

      expect(mockPrismaService.adminInvite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'test@example.com',
          }),
        }),
      );
    });
  });

  describe('revokeInvite', () => {
    it('should revoke a pending invite', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue({
        id: 'invite-id',
        status: 'PENDING',
      });
      mockPrismaService.adminInvite.update.mockResolvedValue({
        id: 'invite-id',
        status: 'REVOKED',
      });

      const result = await service.revokeInvite('invite-id');

      expect(result.success).toBe(true);
    });

    it('should throw NotFoundException for non-existent invite', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(null);

      await expect(service.revokeInvite('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for already redeemed invite', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue({
        id: 'invite-id',
        status: 'REDEEMED',
      });

      await expect(service.revokeInvite('invite-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('redeemInvite', () => {
    const validInvite = {
      id: 'invite-id',
      email: 'test@example.com',
      tokenHash: 'valid-hash',
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 86400000), // Tomorrow
      creditsGrant: 200,
      durationDays: 30,
    };

    it('should throw NotFoundException for invalid token', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(null);

      await expect(
        service.redeemInvite({ token: 'invalid' }, 'user-id', 'test@example.com'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for already redeemed invite', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue({
        ...validInvite,
        status: 'REDEEMED',
      });

      await expect(
        service.redeemInvite({ token: 'token' }, 'user-id', 'test@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for revoked invite', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue({
        ...validInvite,
        status: 'REVOKED',
      });

      await expect(
        service.redeemInvite({ token: 'token' }, 'user-id', 'test@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for expired invite', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue({
        ...validInvite,
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
      });
      mockPrismaService.adminInvite.update.mockResolvedValue({});

      await expect(
        service.redeemInvite({ token: 'token' }, 'user-id', 'test@example.com'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException for email mismatch', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(validInvite);

      await expect(
        service.redeemInvite({ token: 'token' }, 'user-id', 'other@example.com'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException if user already has active Admin Edition', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(validInvite);
      mockPrismaService.userEntitlement.findUnique.mockResolvedValue({
        userId: 'user-id',
        communityBadge: 'ADMIN_EDITION',
        communityBadgeExpiresAt: new Date(Date.now() + 86400000), // Tomorrow
      });

      await expect(
        service.redeemInvite({ token: 'token' }, 'user-id', 'test@example.com'),
      ).rejects.toThrow(ConflictException);
    });

    it('should successfully redeem a valid invite', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(validInvite);
      mockPrismaService.userEntitlement.findUnique.mockResolvedValue({
        userId: 'user-id',
        communityBadge: 'NONE',
        plan: 'INACTIVE',
      });
      mockPrismaService.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.redeemInvite(
        { token: 'token' },
        'user-id',
        'test@example.com',
      );

      expect(result.success).toBe(true);
      expect(result.creditsAdded).toBe(200);
      expect(result.badgeEnabled).toBe(true);
    });
  });

  describe('checkInviteByToken', () => {
    it('should return valid=false for non-existent token', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue(null);

      const result = await service.checkInviteByToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid invite token');
    });

    it('should return valid=true for valid pending invite', async () => {
      mockPrismaService.adminInvite.findUnique.mockResolvedValue({
        email: 'test@example.com',
        creditsGrant: 200,
        durationDays: 30,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 86400000),
      });

      const result = await service.checkInviteByToken('valid-token');

      expect(result.valid).toBe(true);
      expect(result.email).toBe('test@example.com');
    });
  });
});
