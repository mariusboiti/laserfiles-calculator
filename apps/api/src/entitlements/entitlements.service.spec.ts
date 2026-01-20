import { EntitlementsService } from './entitlements.service';
import type { RequestLike } from '../common/geo/country.resolver';

function createPrismaMock(overrides?: Partial<any>) {
  const base: any = {
    userEntitlement: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: (promises: any[]) => Promise.all(promises),
  };
  return Object.assign(base, overrides || {});
}

describe('EntitlementsService.getUiEntitlementsForUserId - geo fallback', () => {
  const userId = 'user-1';

  beforeEach(() => {
    process.env.RO_FREE_ENABLED = 'true';
    process.env.RO_FREE_COUNTRY_CODES = 'RO';
    process.env.NON_RO_FREE_GRACE_DAYS = '7';
  });

  test('RO user without entitlement gets FREE_RO non-AI Studio access', async () => {
    const prisma = createPrismaMock();
    const createdAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    prisma.userEntitlement.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ createdAt });

    const service = new EntitlementsService(prisma as any);
    const req: RequestLike = { headers: { 'cf-ipcountry': 'ro' } };

    const result = await service.getUiEntitlementsForUserId(userId, req);

    expect(result.country).toBe('RO');
    expect(result.plan).toBe('FREE_RO');
    expect(result.canUseStudio).toBe(true);
    expect(result.canUseAi).toBe(false);
    expect(result.reason === 'RO_FREE' || result.reason === 'RO_FREE_OVERRIDE').toBe(true);
  });

  test('non-RO user without entitlement but inside grace gets FREE non-AI Studio access', async () => {
    const prisma = createPrismaMock();
    const createdAt = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    prisma.userEntitlement.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ createdAt });

    const service = new EntitlementsService(prisma as any);
    const req: RequestLike = { headers: { 'cf-ipcountry': 'de' } };

    const result = await service.getUiEntitlementsForUserId(userId, req);

    expect(result.country).toBe('DE');
    expect(result.plan).toBe('FREE');
    expect(result.canUseStudio).toBe(true);
    expect(result.canUseAi).toBe(false);
    expect(result.reason).toBe('NON_RO_GRACE');
    expect(result.graceUntil).not.toBeNull();
  });

  test('non-RO user without entitlement and after grace has Studio locked', async () => {
    const prisma = createPrismaMock();
    const createdAt = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    prisma.userEntitlement.findUnique.mockResolvedValue(null);
    prisma.user.findUnique.mockResolvedValue({ createdAt });

    const service = new EntitlementsService(prisma as any);
    const req: RequestLike = { headers: { 'cf-ipcountry': 'us' } };

    const result = await service.getUiEntitlementsForUserId(userId, req);

    expect(result.country).toBe('US');
    expect(result.plan).toBe('FREE');
    expect(result.canUseStudio).toBe(false);
    expect(result.canUseAi).toBe(false);
    expect(result.reason).toBe('NO_ENTITLEMENT');
  });

  test('user with ACTIVE entitlement has canUseStudio and canUseAi based on credits', async () => {
    const prisma = createPrismaMock();
    const createdAt = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    prisma.userEntitlement.findUnique.mockResolvedValue({
      userId,
      plan: 'ACTIVE',
      trialStartedAt: null,
      trialEndsAt: null,
      aiCreditsTotal: 10,
      aiCreditsUsed: 1,
      stripeCustomerId: null,
    });
    prisma.user.findUnique.mockResolvedValue({ createdAt });

    const service = new EntitlementsService(prisma as any);
    const req: RequestLike = { headers: { 'cf-ipcountry': 'ro' } };

    const result = await service.getUiEntitlementsForUserId(userId, req);

    expect(result.plan).toBe('ACTIVE');
    expect(result.isActive).toBe(true);
    expect(result.canUseStudio).toBe(true);
    expect(result.canUseAi).toBe(true);
    expect(result.aiCreditsRemaining).toBe(9);
    expect(result.reason).toBe('ENTITLEMENT_ACTIVE');
  });
});
