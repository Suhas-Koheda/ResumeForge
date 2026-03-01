import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity("users")
export class User {
    @PrimaryGeneratedColumn("uuid")
    id!: string;

    @Column({ type: "varchar", unique: true })
    email!: string;

    @Column({ type: "varchar" })
    password!: string;

    @Column({ type: "boolean", default: false })
    isVerified!: boolean;

    @Column({ type: "varchar", nullable: true })
    verificationToken?: string;

    @Column({ type: "varchar", nullable: true })
    resetPasswordToken?: string;

    @Column({
        type: "varchar",
        nullable: true,
        transformer: {
            to: (value?: Date) => value?.toISOString(),
            from: (value?: string) => value ? new Date(value) : null
        }
    })
    resetPasswordExpires?: Date;

    @CreateDateColumn()
    createdAt!: Date;
}
