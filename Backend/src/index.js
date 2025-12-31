import express from "express";
import connectDb from "./config/db.js";
import videoRoutes from "./routes/video.route.js";
import cors from "cors";
import {PORT} from "./constants.js";

const app = express();
app.use(cors());
const port = PORT || 3000;

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