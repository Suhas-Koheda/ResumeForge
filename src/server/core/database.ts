import { DataSource } from 'typeorm';
import { config } from './config.js';
import { User } from '../entities/User.entity.js';
import { Resume } from '../entities/Resume.entity.js';

export const AppDataSource = new DataSource(
    config.IS_LOCAL
        ? {
            type: "sqlite",
            database: "local_dev.sqlite",
            synchronize: true,
            logging: true,
            entities: [User, Resume],
            subscribers: [],
            migrations: [],
        }
        : {
            type: "postgres",
            url: config.MONGODB_URI.startsWith('jdbc:') ? config.MONGODB_URI.replace('jdbc:postgresql://', 'postgres://') : config.MONGODB_URI,
            synchronize: true,
            logging: false,
            entities: [User, Resume],
            subscribers: [],
            migrations: [],
            ssl: { rejectUnauthorized: false },
            extra: {
                max: 5,
                idleTimeoutMillis: 30000,
                connectionTimeoutMillis: 5000
            }
        }
);

let dbConnectionPromise: Promise<DataSource> | null = null;
export async function connectToDatabase() {
    if (!dbConnectionPromise) {
        dbConnectionPromise = AppDataSource.initialize().then(ds => {
            console.log(`--- ${config.IS_LOCAL ? 'SQLite' : 'Postgres'} Database Connected ---`);
            return ds;
        }).catch(err => {
            console.error("Database connection error:", err);
            dbConnectionPromise = null; // Allow retry
            throw err;
        });
    }
    return await dbConnectionPromise;
}
