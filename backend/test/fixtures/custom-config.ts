import { AppConfig, PluginRegistry } from '../../src/types';
import { consoleLogMiddleware, consoleLogParameterizedMiddleware } from './middlewares';
import { MyServiceRepositoryPlugin } from './repositories';

const middlewarePlugins = [
    { makeMiddleware: consoleLogMiddleware },
    { makeMiddleware: consoleLogParameterizedMiddleware, makeMiddlewareArgs: ["Hi Log"] },
]

export const config = {
    'myKey': 'myValue',
    // 'databaseUrl': 'postgres://me:me@localhost:5432/nepal_civic',
    'appPort': 9000,
    'plugins': {
        'repositories': [MyServiceRepositoryPlugin],
        'middleware': middlewarePlugins
    } as Partial<PluginRegistry>
} as Partial<AppConfig>;
