import { Request, Response, Router } from "express";
import { createQueryBuilder, getConnection, getRepository } from "typeorm";
import { Comment } from "../entities/Comment";
import { Post } from "../entities/Post";
import { Sub } from "../entities/Sub";

import authMiddleware from "../middleware/check-auth";
import userMiddleware from "../middleware/user";

const createPost = async (req: Request, res: Response) => {
    const { title, body, sub } = req.body;

    const user = res.locals.user;

    if (title.trim() === "") {
        return res.status(400).json({ title: "Title must not be empty" });
    }

    try {
        //find sub
        const subRecord = await Sub.findOneOrFail({ name: sub });

        const post = new Post({ title, body, user, sub: subRecord });
        await post.save();

        return res.json(post);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "something went wrong" });
    }
};

const getCursorPaginatedPosts = async (req: Request, res: Response) => {
    const limit: number = (req.query.limit || 0) as number;
    const cursor: string = (req.query.cursor || null) as string;

    const realLimit = Math.min(50, limit);
    const realLimitPlusOne = realLimit + 1;

    try {
        // const qb = getConnection()
        //     .getRepository(Post)
        //     .createQueryBuilder("p")
        //     .orderBy('p."createdAt"', "DESC")
        //     .take(realLimitPlusOne);

        // const qb = getConnection()
        //     .createQueryBuilder()
        //     .select("p")
        //     .from(Post, "p")
        //     .leftJoinAndSelect("p.sub", "sub")
        //     .orderBy('p."createdAt"', "DESC")
        //     .take(realLimitPlusOne);

        const qb = getRepository(Post)
            .createQueryBuilder("p")
            .leftJoinAndSelect("p.sub", "sub")
            .leftJoinAndSelect("p.comments", "comment")
            .leftJoinAndSelect("p.votes", "vote")
            .orderBy("p.createdAt", "DESC")
            .take(realLimitPlusOne);

        if (cursor) {
            qb.where('p."createdAt" < :cursor', { cursor });
        }
        const posts = await qb.getMany();
        console.log("Posts: ", posts);
        if (res.locals.user) {
            posts.forEach((p) => {
                p.setUserVote(res.locals.user);
            });
        }

        console.log("postLength: ", posts.length);
        console.log("realLimitPlusOne: ", realLimitPlusOne);

        const paginatedPosts = {
            hasMore: posts.length === realLimitPlusOne,
            posts: posts.slice(0, realLimit),
        };

        return res.json(paginatedPosts);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Something went wrong" });
    }
};

const getPosts = async (req: Request, res: Response) => {
    const currentPage: number = (req.query.page || 0) as number;
    const postPerPage: number = (req.query.count || 8) as number;

    try {
        const posts = await Post.find({
            order: {
                createdAt: "DESC",
            },
            relations: ["comments", "votes", "sub"],
            skip: currentPage * postPerPage,
            take: postPerPage,
        });
        if (res.locals.user) {
            posts.forEach((p) => {
                p.setUserVote(res.locals.user);
            });
        }

        return res.json(posts);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Something went wrong" });
    }
};

const getPost = async (req: Request, res: Response) => {
    const { identifier, slug } = req.params;

    try {
        const post = await Post.findOneOrFail(
            { identifier, slug },
            {
                relations: ["sub", "votes", "comments"],
            }
        );

        if (res.locals.user) {
            post.setUserVote(res.locals.user);
        }

        return res.json(post);
    } catch (error) {
        console.log(error);
        return res.status(404).json({ error: "Post not found" });
    }
};

const commentOnPost = async (req: Request, res: Response) => {
    const { identifier, slug } = req.params;
    const body = req.body.body;

    try {
        const post = await Post.findOneOrFail({ identifier, slug });

        const comment = new Comment({
            body,
            user: res.locals.user,
            post,
        });

        await comment.save();
        return res.json(comment);
    } catch (err) {
        console.log(err);
        return res.status(404).json({ error: "Post not found" });
    }
};

const getPostComment = async (req: Request, res: Response) => {
    const { identifier, slug } = req.params;

    try {
        const post = await Post.findOneOrFail({ identifier, slug });

        const comments = await Comment.find({
            where: { post },
            order: { createdAt: "DESC" },
            relations: ["votes"],
        });

        if (res.locals.user) {
            comments.forEach((comment) => comment.setUserVote(res.locals.user));
        }

        return res.json(comments);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Something went wrong" });
    }
};

const router = Router();
router.post("/", userMiddleware, authMiddleware, createPost);
router.get("/", userMiddleware, getPosts);
router.get("/paginated", userMiddleware, getCursorPaginatedPosts);
router.get("/:identifier/:slug", userMiddleware, getPost);
router.post(
    "/:identifier/:slug/comments",
    userMiddleware,
    authMiddleware,
    commentOnPost
);
router.get("/:identifier/:slug/comments", userMiddleware, getPostComment);

export default router;
