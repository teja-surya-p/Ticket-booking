"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const constants_1 = require("./common/constants");
const app_config_1 = require("./config/app.config");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const corsOrigins = app_config_1.appConfig.corsOrigin
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
    const allowAllOrigins = corsOrigins.length === 0 || corsOrigins.includes('*');
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin || allowAllOrigins || corsOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error(`CORS blocked for origin: ${origin}`), false);
        },
        credentials: !allowAllOrigins,
    });
    app.setGlobalPrefix(constants_1.API_PREFIX);
    await app.listen(app_config_1.appConfig.port);
    console.log(`Backend running on http://localhost:${app_config_1.appConfig.port}/${constants_1.API_PREFIX}`);
}
void bootstrap();
