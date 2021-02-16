import "reflect-metadata";
import { createConnection } from "typeorm";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

import authRoutes from "./routes/auth";
import postRoutes from "./routes/posts";
import subRoutes from "./routes/subs";
import miscRoutes from "./routes/misc";

import trim from "./middleware/trim";

// import redis from "redis";
import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
// import { sendEmail } from "./util/sendEmails";

// sendEmail("reza@mail.com", "hello there");
const app = express();

const RedisStore = connectRedis(session);
const redis = new Redis();
// const redisClient = redis.createClient();

app.use(express.json());
app.use(morgan("dev"));
app.use(trim);

app.use(
    cors({
        origin: "http://localhost:3000",
        credentials: true,
        optionsSuccessStatus: 200,
    })
);
app.use(
    session({
        name: "qid",
        store: new RedisStore({
            client: redis as any,
            disableTouch: true,
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
            httpOnly: true, //cant access cookie in front end
            sameSite: "lax", // csrf
            secure: process.env.NODE_ENV === "production", //cookie only works in https
        },
        saveUninitialized: false, //
        secret: "goacgrasisthebest",
        resave: false,
    })
);

app.use(express.static("public"));

app.get("/", (_, res) => {
    res.send("hello world");
});
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/subs", subRoutes);
app.use("/api/misc", miscRoutes);

app.listen(process.env.PORT, async () => {
    console.log("Server running at http://localhost:5000");

    try {
        await createConnection();
        console.log("Database connected");
    } catch (err) {
        console.log(err);
    }
});
