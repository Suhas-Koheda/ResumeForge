import { DataSource } from 'typeorm';
import { Resume } from '../entities/Resume.entity.js';
import { Template } from '../entities/Template.entity.js';
import { TemplateVersion } from '../entities/TemplateVersion.entity.js';

export const AppDataSource = new DataSource({
    type: 'sqlite',
    database: 'local_dev.sqlite',
    synchronize: true,
    logging: false,
    entities: [Resume, Template, TemplateVersion],
    subscribers: [],
    migrations: [],
});

let dbConnectionPromise: Promise<DataSource> | null = null;

export async function connectToDatabase(): Promise<DataSource> {
    if (!dbConnectionPromise) {
        dbConnectionPromise = AppDataSource.initialize()
            .then(ds => {
                console.log('--- SQLite Database Connected ---');
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
