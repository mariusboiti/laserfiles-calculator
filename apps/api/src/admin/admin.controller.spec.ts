import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<AdminService>;

  const mockAdminService = {
    getStats: jest.fn(),
    listUsers: jest.fn(),
    getUserDetails: jest.fn(),
    addCredits: jest.fn(),
    forceSyncFromWp: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: mockAdminService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AdminController>(AdminController);
    adminService = module.get(AdminService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should return admin stats', async () => {
      const mockStats = {
        totalUsers: 100,
        usersByPlan: { ACTIVE: 50, TRIALING: 30, CANCELED: 10, INACTIVE: 10 },
        totalCreditsRemaining: 5000,
        totalCreditsUsed: 3000,
        totalCreditsGranted: 8000,
      };
      mockAdminService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(result).toEqual(mockStats);
      expect(mockAdminService.getStats).toHaveBeenCalled();
    });
  });

  describe('listUsers', () => {
    it('should return paginated users list', async () => {
      const mockResponse = {
        users: [{ id: '1', email: 'test@example.com', plan: 'ACTIVE' }],
        total: 1,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      };
      mockAdminService.listUsers.mockResolvedValue(mockResponse);

      const result = await controller.listUsers({ page: 1, pageSize: 25 });

      expect(result).toEqual(mockResponse);
      expect(mockAdminService.listUsers).toHaveBeenCalledWith({ page: 1, pageSize: 25 });
    });

    it('should filter by search query', async () => {
      const mockResponse = { users: [], total: 0, page: 1, pageSize: 25, totalPages: 0 };
      mockAdminService.listUsers.mockResolvedValue(mockResponse);

      await controller.listUsers({ search: 'test@', page: 1, pageSize: 25 });

      expect(mockAdminService.listUsers).toHaveBeenCalledWith({
        search: 'test@',
        page: 1,
        pageSize: 25,
      });
    });
  });

  describe('getUserDetails', () => {
    it('should return user details with entitlement and audit logs', async () => {
      const mockDetails = {
        user: { id: '1', email: 'test@example.com', name: 'Test User' },
        entitlement: { plan: 'ACTIVE', aiCreditsTotal: 100, aiCreditsUsed: 50 },
        auditLogs: [],
      };
      mockAdminService.getUserDetails.mockResolvedValue(mockDetails);

      const result = await controller.getUserDetails('1');

      expect(result).toEqual(mockDetails);
      expect(mockAdminService.getUserDetails).toHaveBeenCalledWith('1');
    });
  });

  describe('addCredits', () => {
    it('should add credits to user', async () => {
      const mockResult = {
        success: true,
        entitlement: { plan: 'ACTIVE', aiCreditsTotal: 150, aiCreditsUsed: 50 },
      };
      mockAdminService.addCredits.mockResolvedValue(mockResult);

      const mockReq = {
        headers: { 'x-forwarded-for': '127.0.0.1', 'user-agent': 'test' },
        ip: '127.0.0.1',
      } as any;

      const result = await controller.addCredits(
        '1',
        { amount: 50, reason: 'Test credit addition' },
        { sub: 'admin-id' },
        mockReq,
      );

      expect(result).toEqual(mockResult);
      expect(mockAdminService.addCredits).toHaveBeenCalledWith(
        'admin-id',
        '1',
        50,
        'Test credit addition',
        '127.0.0.1',
        'test',
      );
    });
  });

  describe('forceSyncFromWp', () => {
    it('should force sync from WordPress', async () => {
      const mockResult = {
        success: true,
        user: { id: '1', email: 'test@example.com' },
        entitlement: { plan: 'ACTIVE' },
      };
      mockAdminService.forceSyncFromWp.mockResolvedValue(mockResult);

      const mockReq = {
        headers: { 'x-forwarded-for': '127.0.0.1', 'user-agent': 'test' },
        ip: '127.0.0.1',
      } as any;

      const result = await controller.forceSyncFromWp(
        '1',
        { reason: 'Test sync' },
        { sub: 'admin-id' },
        mockReq,
      );

      expect(result).toEqual(mockResult);
      expect(mockAdminService.forceSyncFromWp).toHaveBeenCalledWith(
        'admin-id',
        '1',
        'Test sync',
        '127.0.0.1',
        'test',
      );
    });
  });
});
