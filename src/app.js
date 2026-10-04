import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));
app.use(express.json({ limit: '16kb' })); // Set the limit to 16kb for JSON payloads that are sent to the server.
app.use(express.urlencoded({ extended: true, limit: '16kb' })); // urlencoded is used to handle different types of extended url that are sent to the server. The limit is set to 16kb for urlencoded payloads.
app.use(express.static('Public'));
app.use(cookieParser()); // cookie parser is used to set and access cookies of the user on the browser.

export { app };