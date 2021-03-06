import { validate, isEmpty } from "class-validator";
import { Request, Response, Router } from "express";
import argon2 from "argon2";
import jwt from "jsonwebtoken";
import { v4 } from "uuid";

import { User } from "../entities/User";
import { Session, SessionData } from "express-session";
// import { MyContext } from "../types";
import authMiddleware from "../middleware/check-auth";
import userMiddleware from "../middleware/user";
import { sendEmail } from "../util/sendEmails";
import Redis from "ioredis";

const redis = new Redis();

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

const forgotPassword = async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
        return res.json({ forgotPassword: true });
    }
    console.log("user.username: ", user.username);
    const token = jwt.sign(
        { username: user.username },
        process.env.JWT_SECRET!
    );

    await redis.set(
        "forget-password:" + token,
        token,
        "ex",
        1000 * 60 * 60 * 24 * 3
    );

    await sendEmail(
        email,
        `<a href="http://localhost:3000/change-password/${token}">reset password</a>`
    );

    return res.json({ forgotPassword: true });
};

const changePassword = async (
    req: Request & {
        session: Session & Partial<SessionData> & { accessToken?: string };
    },
    res: Response
) => {
    const { newPassword, token } = req.body;
    // const { token } = req.params;

    try {
        let errors: any = {};

        if (isEmpty(newPassword))
            errors.newPassword = "Password must not be empty";
        if (Object.keys(errors).length > 0) {
            return res.status(401).json(errors);
        }
        const key = "forget-password:" + token;
        const userToken = await redis.get(key);
        console.log("userToken: ", userToken);
        if (!userToken)
            return res.status(404).json({ newPassword: "Unauthenticated" });

        const { username }: any = jwt.verify(
            userToken,
            process.env.JWT_SECRET!
        );
        console.log("Username: ", username);
        if (!username)
            return res.status(401).json({ newPassword: "Invalid Token" });

        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ newPassword: "User not found" });
        }

        user.password = newPassword;
        user.save();

        // req.session.accessToken = userToken;

        await redis.del(key);

        return res.json(user);
    } catch (err) {
        console.log(err);
        return res.status(500).json({ error: "Something went wrong" });
    }
};

const router = Router();
router.get("/me", userMiddleware, authMiddleware, me);
router.post("/register", register);
router.post("/login", login);
router.get("/logout", userMiddleware, authMiddleware, logout);
router.post("/forgot-password", forgotPassword);
router.post("/change-password", changePassword);

export default router;
