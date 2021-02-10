import { IsEmail, Length } from "class-validator";
import {
    Entity as TOEntity,
    Column,
    Index,
    BeforeInsert,
    OneToMany,
} from "typeorm";
import argon2 from "argon2";
import { Exclude } from "class-transformer";

import Entity from "./Entity";
import { Post } from "./Post";
import { Vote } from "./Vote";

@TOEntity("users")
export class User extends Entity {
    //to use new User({...})
    //some of the field could be nullable Partial<User>
    constructor(user: Partial<User>) {
        super();
        Object.assign(this, user);
    }

    @Index()
    @IsEmail(undefined, { message: "Must be a valid email address" })
    @Length(1, 255, { message: "Email is empty" })
    @Column({ unique: true })
    email: string;

    @Index()
    @Length(3, 255, { message: "Must be at least 3 character" })
    @Column({ unique: true })
    username: string;

    @Exclude()
    @Column()
    @Length(6, 255, { message: "Must be at least 6 character" })
    password: string;

    @OneToMany(() => Post, (post) => post.user)
    posts: Post[];

    @OneToMany(() => Vote, (vote) => vote.user)
    votes: Vote[];

    @BeforeInsert()
    async hashPassword() {
        this.password = await argon2.hash(this.password);
    }
}
