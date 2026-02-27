import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar", unique: true })
    email!: string;

    @Column({ type: "varchar" })
    password!: string;

    @CreateDateColumn()
    createdAt!: Date;
}
