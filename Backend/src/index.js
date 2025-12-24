import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import videoRoutes from "./routes/video.route.js";
import cors from "cors";

app.use(cors());

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json(
    {
        limit: "30kb"
    }
)); // This will parse the json request and put it in req.body


app.use("/api/v1/video",videoRoutes);


//iifee to connect to db automatically.
(async () =>{
    //connect to db
    try{
        await connectDb();
    }
    catch(err){
        console.log("File(Server.js) unable to connect to db. Error: ",err);
    }

})();


app.listen(port, ()=>{
    console.log(`Server is running on port ${port}`);
});

export default app;