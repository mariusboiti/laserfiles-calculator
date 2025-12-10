"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TimeLogsController = void 0;
const common_1 = require("@nestjs/common");
const time_logs_service_1 = require("./time-logs.service");
const jwt_auth_guard_1 = require("../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const user_decorator_1 = require("../common/decorators/user.decorator");
const swagger_1 = require("@nestjs/swagger");
let TimeLogsController = class TimeLogsController {
    constructor(timeLogsService) {
        this.timeLogsService = timeLogsService;
    }
    async listForItem(orderId, itemId) {
        return this.timeLogsService.listForItem(orderId, itemId);
    }
    async start(orderId, itemId, user) {
        return this.timeLogsService.start(orderId, itemId, user.sub);
    }
    async stop(orderId, itemId, user) {
        return this.timeLogsService.stop(orderId, itemId, user.sub);
    }
};
exports.TimeLogsController = TimeLogsController;
__decorate([
    (0, common_1.Get)('orders/:orderId/items/:itemId'),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Param)('itemId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TimeLogsController.prototype, "listForItem", null);
__decorate([
    (0, common_1.Post)('orders/:orderId/items/:itemId/start'),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TimeLogsController.prototype, "start", null);
__decorate([
    (0, common_1.Post)('orders/:orderId/items/:itemId/stop'),
    __param(0, (0, common_1.Param)('orderId')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, user_decorator_1.User)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], TimeLogsController.prototype, "stop", null);
exports.TimeLogsController = TimeLogsController = __decorate([
    (0, swagger_1.ApiTags)('time-logs'),
    (0, swagger_1.ApiBearerAuth)('access-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    (0, common_1.Controller)('time-logs'),
    __metadata("design:paramtypes", [time_logs_service_1.TimeLogsService])
], TimeLogsController);
