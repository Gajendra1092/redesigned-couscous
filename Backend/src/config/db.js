import mongoose from "mongoose";

async function connectDb(){
     try{
        const connectionInstance  = await mongoose.connect(`${process.env.MONGODB_URI}`)
        console.log("MongoDB connected!")
     }
     catch(err){
        console.log("Unable to connect MongoDB. The error : ",err);
     }
}


export default connectDb;


