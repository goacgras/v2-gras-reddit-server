import { validate, isEmpty } from "class-validator";
import { Request, Response, Router } from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";

import { User } from "../entities/User";
import { Session, SessionData } from "express-session";
// import { MyContext } from "../types";
import authMiddleware from "../middleware/check-auth";

const mapErrors = (errors: Object[]) => {
    return errors.reduce((prev: any, err: any) => {
        prev[err.property] = Object.entries(err.constraints)[0][1];
        return prev;
    }, {});
};

const register = async (req: Request, res: Response) => {
    const { email, username, password } = req.body;

    try {
        //validate data
        let errors: any = {};
        const userEmail = await User.findOne({ email });
        const userUsername = await User.findOne({ username });

        if (userEmail) errors.email = "Email already taken";
        if (userUsername) errors.username = "Username already taken";

        if (Object.keys(errors).length > 0) {
            return res.status(400).json(errors);
        }

        //create user
        const user = new User({ email, username, password });

        errors = await validate(user);
        if (errors.length > 0) {
            return res.status(400).json(mapErrors(errors));
            // return res.status(400).json({ errors });
        }
        await user.save();

        //return user
        return res.json(user);
    } catch (err) {
        console.log(err);
        return res.status(500).json(err);
    }
};

const login = async (
    req: Request & {
        session: Session & Partial<SessionData> & { accessToken?: string };
    },
    res: Response
) => {
    const { username, password } = req.body;

    try {
        let errors: any = {};

        if (isEmpty(username)) errors.username = "Username must not be empty";
        if (isEmpty(password)) errors.password = "Password must not be empty";
        if (Object.keys(errors).length > 0) {
            return res.status(401).json(errors);
        }

        const user = await User.findOne({ username });
        if (!user) return res.status(404).json({ username: "User not found" });

        const validPassword = await argon2.verify(user.password, password);
        if (!validPassword) {
            return res.status(401).json({ password: "Invalid password" });
        }
        const token = jwt.sign({ username }, process.env.JWT_SECRET!);
        req.session.accessToken = token;

        return res.json(user);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Something went wrong" });
    }
};

const me = async (_: Request, res: Response) => {
    return res.json(res.locals.user);
};

const logout = async (req: Request, res: Response) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false });
        }
        res.clearCookie("qid");
        return res.status(200).json({ success: true });
    });
};

const router = Router();
router.get("/me", authMiddleware, me);
router.post("/register", register);
router.post("/login", login);
router.get("/logout", authMiddleware, logout);

export default router;
