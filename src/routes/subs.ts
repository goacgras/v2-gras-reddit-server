import { isEmpty } from "class-validator";
import { getRepository } from "typeorm";
import { NextFunction, Request, Response, Router } from "express";
import multer, { FileFilterCallback } from "multer";
import path from "path";
import fs from "fs";

import authMiddleware from "../middleware/check-auth";
import userMiddleware from "../middleware/user";

import { Sub } from "../entities/Sub";
import { Post } from "../entities/Post";
import { User } from "../entities/User";
import { makeId } from "../util/helpers";

const createSub = async (req: Request, res: Response) => {
    const { name, title, description }: Sub = req.body;

    const user: User = res.locals.user;

    try {
        let errors: any = {};
        if (isEmpty(name)) errors.name = "Name must not be empty";
        if (isEmpty(title)) errors.title = "Title must not be empty";

        const sub = await getRepository(Sub)
            .createQueryBuilder("sub")
            .where("lower(sub.name) = :name", { name: name.toLowerCase() })
            .getOne();

        if (sub) errors.name = "Sub exists already";

        if (Object.keys(errors).length > 0) {
            throw errors;
        }
    } catch (err) {
        return res.status(400).json(err);
    }

    try {
        const sub = new Sub({ name, title, description, user });
        await sub.save();
        return res.json(sub);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Something went wrong" });
    }
};

const getSub = async (req: Request, res: Response) => {
    const name = req.params.name;

    try {
        const sub = await Sub.findOneOrFail({ name });
        const post = await Post.find({
            where: { sub },
            order: { createdAt: "DESC" },
            relations: ["comments", "votes"],
        });

        sub.posts = post;

        if (res.locals.user) {
            sub.posts.forEach((p) => {
                p.setUserVote(res.locals.user);
            });
        }

        return res.json(sub);
    } catch (err) {
        console.log(err);
        return res.status(404).json({ sub: "Sub not found" });
    }
};

const ownSub = async (req: Request, res: Response, next: NextFunction) => {
    const user: User = res.locals.user;

    try {
        const sub = await Sub.findOneOrFail({
            where: { name: req.params.name },
        });
        if (sub.username !== user.username) {
            return res.status(403).json({ error: "You dont own this sub" });
        }
        res.locals.sub = sub;
        return next();
    } catch (err) {
        return res.status(500).json({ error: "Something went wrong" });
    }
};

const upload = multer({
    storage: multer.diskStorage({
        destination: "public/images",
        filename: (_, file, callback) => {
            const name = makeId(15);
            callback(null, name + path.extname(file.originalname)); //i.e aaa + .png
        },
    }),
    fileFilter: (_, file: any, callback: FileFilterCallback) => {
        if (file.mimetype == "image/jpeg" || file.mimetype == "image/png") {
            callback(null, true);
        } else {
            callback(new Error("File not supported"));
        }
    },
});

const uploadSubImage = async (req: Request, res: Response) => {
    const sub: Sub = res.locals.sub;
    try {
        const type = req.body.type;
        if (type !== "image" && type !== "banner") {
            fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: "invalid type" });
        }

        let oldImageUrn: string = "";
        if (type === "image") {
            oldImageUrn = sub.imageUrn || "";
            sub.imageUrn = req.file.filename;
        } else {
            oldImageUrn = sub.bannerUrn || "";
            sub.bannerUrn = req.file.filename;
        }

        await sub.save();

        if (oldImageUrn !== "") {
            fs.unlinkSync(`public\\images\\${oldImageUrn}`);
        }
        return res.json(sub);
    } catch (err) {
        return res.status(500).json({ error: "Something went wrong" });
    }
};

const searchSub = async (req: Request, res: Response) => {
    try {
        const name = req.params.name;

        if (isEmpty(name)) {
            return res.status(400).json({ error: "Name must not be empty" });
        }

        const subs = await getRepository(Sub)
            .createQueryBuilder()
            //react => rea
            .where("LOWER(name) LIKE :name", {
                name: `${name.toLocaleLowerCase().trim()}%`,
            })
            .getMany();

        return res.json(subs);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Something went wrong" });
    }
};

const router = Router();
router.post("/", userMiddleware, authMiddleware, createSub);
router.get("/:name", userMiddleware, getSub);
router.post(
    "/:name/image",
    userMiddleware,
    authMiddleware,
    ownSub,
    upload.single("file"),
    uploadSubImage
);
router.get("/search/:name", searchSub);

export default router;
