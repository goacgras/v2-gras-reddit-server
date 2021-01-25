import "reflect-metadata";
import { createConnection } from "typeorm";
import express from "express";
import morgan from "morgan";
import dotenv from "dotenv";
dotenv.config();

import authRoutes from "./routes/auth";
import trim from "./middleware/trim";

import redis from "redis";
import session from "express-session";
import connectRedis from "connect-redis";

const app = express();

const RedisStore = connectRedis(session);
const redisClient = redis.createClient();

app.use(express.json());
app.use(morgan("dev"));
app.use(trim);

app.use(
    session({
        name: "qid",
        store: new RedisStore({
            client: redisClient,
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

app.get("/", (_, res) => {
    res.send("hello world");
});
app.use("/api/auth", authRoutes);

app.listen(process.env.PORT, async () => {
    console.log("Server running at http://localhost:5000");

    try {
        await createConnection();
        console.log("Database connected");
    } catch (err) {
        console.log(err);
    }
});
