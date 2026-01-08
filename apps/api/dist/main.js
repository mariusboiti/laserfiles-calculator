"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const dotenv = __importStar(require("dotenv"));
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const path_1 = require("path");
const app_globals_1 = require("./app.globals");
const offcuts_service_1 = require("./offcuts/offcuts.service");
const sales_channels_connections_service_1 = require("./sales-channels/sales-channels.connections.service");
const bodyParser = __importStar(require("body-parser"));
async function bootstrap() {
    dotenv.config({ path: (0, path_1.join)(__dirname, '..', '.env') });
    console.log('DATABASE_URL at runtime:', process.env.DATABASE_URL);
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { bodyParser: false });
    app.use(bodyParser.json({
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        },
    }));
    app.use(bodyParser.urlencoded({
        extended: true,
        verify: (req, _res, buf) => {
            req.rawBody = buf;
        },
    }));
    // Initialize global service references for controllers that cannot rely on normal DI
    try {
        app_globals_1.AppGlobals.offcutsService = app.get(offcuts_service_1.OffcutsService, { strict: false });
        app_globals_1.AppGlobals.salesChannelsConnectionsService = app.get(sales_channels_connections_service_1.SalesChannelsConnectionsService, {
            strict: false,
        });
    }
    catch (err) {
        console.error('Failed to initialize AppGlobals services', err);
    }
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    app.enableCors({
        origin: ['http://77.42.38.96:3000', 'http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.useStaticAssets((0, path_1.join)(process.cwd(), 'uploads'), {
        prefix: '/uploads',
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Laser Workshop API')
        .setDescription('API for craft laser workshop management')
        .setVersion('1.0.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
        .build();
    try {
        const document = swagger_1.SwaggerModule.createDocument(app, config);
        swagger_1.SwaggerModule.setup('docs', app, document);
    }
    catch (error) {
        console.error('Failed to set up Swagger docs', error);
    }
    const port = process.env.PORT || 4000;
    await app.listen(port, '0.0.0.0');
}
bootstrap();
