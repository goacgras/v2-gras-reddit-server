import { validate, isEmpty } from "class-validator";
import { Request, Response, Router } from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";

import { User } from "../entities/User";
import { Session, SessionData } from "express-session";
import checkAuth from "../middleware/check-auth";

interface reqRes {
    req: Request & {
        session: Session & Partial<SessionData> & { username?: string };
    };
    res: Response;
}

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
        if (errors.length > 0) return res.status(400).json({ errors });
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
        if (!user) return res.status(404).json({ error: "User not found" });

        const validPassword = await argon2.verify(user.password, password);
        if (!validPassword) {
            return res.status(401).json({ password: "Invalid password" });
        }
        const token = jwt.sign({ username }, process.env.JWT_SECRET);
        req.session.accessToken = token;

        return res.json(user);
    } catch (err) {
        console.log(err);
        return res.status(500).json(err);
    }
};

const me = async (
    req: Request & {
        session: Session & Partial<SessionData> & { accessToken?: string };
    },
    res: Response
) => {
    try {
        const token = req.session.accessToken;
        if (!token) throw new Error("Unauthenticated");

        const { username }: any = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ username });
        if (!user) throw new Error("Unauthenticated");

        return res.json(user);
    } catch (err) {
        console.log(err);
        return res.status(401).json({ error: err.message });
    }
};

const router = Router();
router.get("/me", me);
router.post("/register", register);
router.post("/login", login);

export default router;
