import { Request, Response, Router } from "express";
import { getConnection } from "typeorm";
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

const getPosts = async (req: Request, res: Response) => {
    const currentPage: number = (req.query.page || 0) as number;
    const postPerPage: number = (req.query.count || 8) as number;
    // const { limit, cursor } = req.body;
    // const realLimit = Math.min(50, limit);
    // const realLimitPlusOne = realLimit + 1;
    // let dateLimit = new Date(parseInt(cursor));
    try {
        // const posts = await getConnection().query(`
        //     select *
        //     from posts
        //     ${cursor ? `where "createdAt" < ${dateLimit} ` : null}
        //     limit ${realLimitPlusOne}
        // `);
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

        // let paginatedPosts = {
        //     hasmore: true,
        //     posts,
        // };
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
router.get("/:identifier/:slug", userMiddleware, getPost);
router.post(
    "/:identifier/:slug/comments",
    userMiddleware,
    authMiddleware,
    commentOnPost
);
router.get("/:identifier/:slug/comments", userMiddleware, getPostComment);

export default router;
