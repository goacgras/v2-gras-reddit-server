import { isEmpty } from "class-validator";
import { getRepository } from "typeorm";
import { Request, Response, Router } from "express";
import { User } from "../entities/User";
import authMiddleware from "../middleware/check-auth";
import { Sub } from "../entities/Sub";

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

const router = Router();
router.post("/", authMiddleware, createSub);

export default router;
