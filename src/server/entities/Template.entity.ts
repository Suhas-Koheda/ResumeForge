import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from "typeorm";
import { User } from "./User.entity.js";
import { TemplateVersion } from "./TemplateVersion.entity.js";

@Entity("templates")
export class Template {
  @PrimaryGeneratedColumn("uuid")
  id!: string;
  
  @Column({ type: "varchar" })
  userId!: string;
  
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: "userId" })
  user!: User;
  
  @Column({ type: "varchar" })
  name!: string;
  
  @Column({ type: "text", nullable: true })
  description?: string;
  
  @Column({ type: 'json' })
  config!: any; // Fonts, colors, layout options
  
  @Column({ type: 'text' })
  preamble!: string;
  
  @Column({ type: 'json' })
  styles!: any; // How each section should be styled
  
  @Column("int", { default: 1 })
  version!: number;
  
  @Column({ type: "text", nullable: true })
  thumbnail?: string; // Base64 or URL
  
  @Column({ type: "boolean", default: false })
  isPublic!: boolean;
  
  @CreateDateColumn()
  createdAt!: Date;
  
  @UpdateDateColumn()
  updatedAt!: Date;
  
  @OneToMany(() => TemplateVersion, (version: TemplateVersion) => version.template)
  versions!: TemplateVersion[];
}
