import mongoose from "mongoose";
import {MONGODB_URI} from "../constants.js";

async function connectDb(){
     try{
        const connectionInstance  = await mongoose.connect(MONGODB_URI)
        console.log("MongoDB connected!")
     }
     catch(err){
        console.log("Unable to connect MongoDB. The error : ",err);
     }
}


export default connectDb;


