import { NextFunction, Request, Response } from "express";

export default (req: Request, res: Response, next: NextFunction) => {
    const exception = ["password"];
    for (let key in req.body) {
        if (!exception.includes(key) && typeof req.body[key] === "string") {
            req.body[key] = req.body[key].trim();
        }
    }

    next();
};
