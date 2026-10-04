import dotenv from "dotenv"; //Everytime when dealing with the database, there is a chance to get an error. So, we need to handle that error. For that, we will use try-catch block. 
// It is a good practice to use async-await with try-catch block to handle errors in asynchronous code.
import connectDB from "./db/index.js"

dotenv.config({
    path: "./.env"  
});

connectDB()
.then(() => {
    import("./app.js").then(({ app }) => {
        app.listen(process.env.PORT || 8000, () => {
            console.log(`Server is running on port ${process.env.PORT || 8000}`);
        });
    })
})
.catch((err) => {
    console.error("MONGODB connection failed!!!: ", err);// Exit the process with a failure code
});

//!This is the one of the approach for the main entry point of the application. It is responsible for connecting to the database and starting the server.
/*
import express from "express";
const app = express();
(async () => {
    try {
         await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
         app.on("error", (err) => {
            console.error("Error: ", err);
            throw err;
         })
         app.listen(process.env.PORT, () => {
            console.log(`Server is running on port ${process.env.PORT}`);
         })
    } catch (error) {
        console.error("Error: ", error);

    }
}) ()
    */