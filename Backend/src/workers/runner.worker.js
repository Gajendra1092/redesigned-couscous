import cron from "node-cron";
import Video from "../models/video.model.js";
import { processVideo } from "./video.worker.js";
import connectDB from "../config/db.js";

try{
    await connectDB();
}
catch(err){
    console.log("Connect failed in runner file!, Err: ");
    console.log(err.message);
}

console.log("Worker started");

// Run every 1 minute
cron.schedule("* * * * *", async () => {
  console.log("Worker tick");
  // Pick ONE unprocessed video atomically
  const video = await Video.findOneAndUpdate(
    { status: "uploaded" },
    { status: "processing" },
    { new: true }
  );

  if (!video) {
    console.log("No videos to process");
    return;
  }

  try {
    const result = await processVideo(video);

    // Mark as ready
    await Video.updateOne(
      { videoId: result.videoId },
      {
        status: "ready",
        thumbnailPath: result.thumbnail,
        hlsPath: result.hlsPath,
        original: result.original,
      }
    );

    console.log("Video processed:", result.videoId);

  } catch (err) {
    console.error("Worker failed:", err.message);

    // Mark as failed
    await Video.updateOne(
      { videoId: video.videoId },
      {
        status: "failed",
        error: err.message,
      }
    );
  }
});
