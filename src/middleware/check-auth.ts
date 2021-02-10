import jwt from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { Session, SessionData } from "express-session";
import { User } from "../entities/User";

//token is in redis, user is in locals
export default async (
    req: Request & {
        session: Session &
            Partial<SessionData> & {
                username: string;
                accessToken: string;
            } & any;
    },
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.session.accessToken) throw new Error("You are not welcome");
        const token = req.session.accessToken;
        if (!token) throw new Error("Unauthenticated");

        const { username }: any = jwt.verify(token, process.env.JWT_SECRET!);
        const user = await User.findOne({ username });
        if (!user) throw new Error("Unauthenticated");

        //save user in locals
        res.locals.user = user;
        return next();
    } catch (err) {
        console.log(err);
        return res.status(401).json({ error: err.message });
    }
};
