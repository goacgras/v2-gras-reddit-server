import { Request, Response } from "express";
import { SessionData, Session } from "express-session";

export type MyContext = {
    req: Request & {
        session: Session & Partial<SessionData> & { username?: string };
    };
    res: Response;
};
