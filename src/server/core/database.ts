import { DataSource } from 'typeorm';
import { config } from './config.js';
import { Resume } from '../entities/Resume.entity.js';
import { Template } from '../entities/Template.entity.js';
import { TemplateVersion } from '../entities/TemplateVersion.entity.js';
import { User } from '../entities/User.entity.js';

const rawUrl = config.DB_URL.replace(/^jdbc:postgresql:\/\//, '').replace(/^jdbc:/, '');
const [hostAndPort, dbName] = rawUrl.split('/');
const [host, portStr] = hostAndPort.split(':');
const port = portStr ? parseInt(portStr) : 5432;

export const AppDataSource = new DataSource(
    config.IS_LOCAL 
    ? {
        type: 'sqlite',
        database: 'local_dev.sqlite',
        synchronize: true,
        logging: false,
        entities: [Resume, Template, TemplateVersion, User],
    }
    : {
        type: 'postgres',
        host: host,
        port: port,
        username: config.DB_USERNAME,
        password: config.DB_PASSWORD,
        database: dbName,
        synchronize: true,
        logging: false,
        entities: [Resume, Template, TemplateVersion, User],
        ssl: {
            rejectUnauthorized: false
        }
    }
);

let dbConnectionPromise: Promise<DataSource> | null = null;

export async function connectToDatabase(): Promise<DataSource> {
    if (!dbConnectionPromise) {
        dbConnectionPromise = AppDataSource.initialize()
            .then(ds => {
                console.log(`--- ${config.IS_LOCAL ? 'SQLite' : 'PostgreSQL'} Database Connected ---`);
                return ds;
            })
            .catch(err => {
                console.error('Database connection error:', err);
                dbConnectionPromise = null; // Allow retry on next call
                throw err;
            });
    }
    return dbConnectionPromise;
}
