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
        const token = req.session.accessToken;
        if (!token) return next();

        const { username }: any = jwt.verify(token, process.env.JWT_SECRET!);
        const user = await User.findOne({ username });

        //save user in locals
        res.locals.user = user;
        return next();
    } catch (err) {
        console.log(err);
        return res.status(401).json({ error: "Unauthenticated" });
    }
};
