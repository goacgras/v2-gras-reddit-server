import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { Session, SessionData } from "express-session";
import { User } from "../entities/User";

export default async (
    req: Request & {
        session: Session &
            Partial<SessionData> & { username: string; accessToken: string };
    },
    res: Response,
    next: NextFunction
) => {
    try {
        const token = req.session.accessToken;
        if (!token) throw new Error("Unauthenticated");

        const { username }: any = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ username });
        if (!user) throw new Error("Unauthenticated");

        res.locals.user = user;
        return next();
    } catch (err) {
        console.log(err);
        return res.status(401).json({ error: err.message });
    }
};
