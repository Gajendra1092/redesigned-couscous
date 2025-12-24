import mongoose from "mongoose";

const videoSchema = new mongoose.Schema(
    {
        videoId:{
            type: String,
            required: true,
            unique: true,
        },

        originalFileName:{
            type: String,
            required: true
        },

        storagePath:{
            type: String,
            requied: true
        },

        mimeType:{
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: ["initiated", "uploaded", "processing", "ready", "failed"],
            default: "initiated",
        },
    },{
        timestamp:true
    }
)

export default mongoose.model("Video",videoSchema);