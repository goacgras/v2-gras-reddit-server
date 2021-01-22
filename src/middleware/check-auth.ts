import { NextFunction, Request, Response } from "express";
import { Session, SessionData } from "express-session";

export default (
    req: Request & {
        session: Session & Partial<SessionData> & { username: string };
    },
    res: Response,
    next: NextFunction
) => {
    if (!req.session.username) {
        return res.status(401).json({ error: "Unauthorize" });
    }
    console.log(req.session.username);
    next();
};
