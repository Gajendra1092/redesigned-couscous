import mongoose from "mongoose";

const renditionSchema = new mongoose.Schema(
  {
    height: {
      type: Number, // 360, 480, 720
      required: true,
    },
    storagePath: {
      type: String, // processed/{videoId}/720p.mp4
      required: true,
    },
  },
  { _id: false }
);

const videoSchema = new mongoose.Schema(
  {
    videoId: {
      type: String,
      required: true,
      unique: true,
    },

    originalFileName: {
      type: String,
      required: true,
    },

    storagePath: {
      type: String,
      requied: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["initiated", "uploaded", "processing", "ready", "failed"],
      default: "initiated",
    },
    thumbnailPath: {
      type: String,
      required: false,
      default: null,
    },
    original: {
      width: Number,
      height: Number,
      duration: Number,
      codec: String,
    },
    renditions: [renditionSchema],
  },
  {
    timestamp: true,
  }
);

export default mongoose.model("Video", videoSchema);
