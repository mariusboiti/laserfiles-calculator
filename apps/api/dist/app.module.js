"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const customers_module_1 = require("./customers/customers.module");
const materials_module_1 = require("./materials/materials.module");
const orders_module_1 = require("./orders/orders.module");
const files_module_1 = require("./files/files.module");
const time_logs_module_1 = require("./time-logs/time-logs.module");
const analytics_module_1 = require("./analytics/analytics.module");
const quotes_module_1 = require("./quotes/quotes.module");
const pricing_module_1 = require("./pricing/pricing.module");
const template_categories_module_1 = require("./template-categories/template-categories.module");
const templates_module_1 = require("./templates/templates.module");
const template_products_module_1 = require("./template-products/template-products.module");
const sales_channels_module_1 = require("./sales-channels/sales-channels.module");
const production_module_1 = require("./production/production.module");
const offcuts_module_1 = require("./offcuts/offcuts.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            customers_module_1.CustomersModule,
            materials_module_1.MaterialsModule,
            orders_module_1.OrdersModule,
            files_module_1.FilesModule,
            time_logs_module_1.TimeLogsModule,
            analytics_module_1.AnalyticsModule,
            quotes_module_1.QuotesModule,
            pricing_module_1.PricingModule,
            template_categories_module_1.TemplateCategoriesModule,
            templates_module_1.TemplatesModule,
            template_products_module_1.TemplateProductsModule,
            sales_channels_module_1.SalesChannelsModule,
            production_module_1.ProductionModule,
            offcuts_module_1.OffcutsModule,
        ],
    })
], AppModule);
