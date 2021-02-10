import { Entity as TOEntity, Column, ManyToOne, JoinColumn } from "typeorm";

import Entity from "./Entity";
import { Post } from "./Post";
import { User } from "./User";
import { Comment } from "./Comment";

@TOEntity("votes")
export class Vote extends Entity {
    //to use new User({...})
    //some of the field could be nullable Partial<User>
    constructor(vote: Partial<Vote>) {
        super();
        Object.assign(this, vote);
    }

    @Column()
    value: number;

    @ManyToOne(() => User)
    @JoinColumn({ name: "username", referencedColumnName: "username" })
    user: User;

    //need to add this for username column would appear in database automatically
    @Column()
    username: string;

    @ManyToOne(() => Post)
    post: Post;

    @ManyToOne(() => Comment)
    comment: Comment;
}
