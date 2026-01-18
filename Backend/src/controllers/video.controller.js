import supabase from "../config/supabase.js";
import { v4 as uuidv4 } from "uuid";
import Video from "../models/video.model.js";

async function initUpload(req, res) {
  try {
    const { fileName, mimeType } = req.body;

    if (!fileName || !mimeType) {
      console.log("FileName or mimiType is not present!");
      return res
        .status(400)
        .json({ error: "FileName or mimiType is not present!" });
    }

    const videoId = uuidv4();

    const filePath = `raw/${videoId}/${fileName}`;

    const { data, error } = await supabase.storage
      .from("VideoStream")
      .createSignedUploadUrl(filePath, 900);

    if (error) {
      throw error;
    }

    await Video.create({
      videoId,
      originalFileName: fileName,
      storagePath: filePath,
      mimeType,
      status: "initiated",
    });

    return res.json({
      videoId,
      uploadUrl: data.signedUrl,
      filePath,
    });
  } catch (err) {
    console.log("initUpload failed due to error: ", err);
    return res.status(500).json({ error: "Failed to init upload" });
  }
}

async function completeUpload(req, res) {
  const { videoId, filePath } = req.body;

  // 1. Save metadata in DB -->
  const video = await Video.findOne({ videoId });
  if (!video) {
    console.log("Video's metadata not uploded to db!");
    return res.json({
      message: "Video's metadata is not uploaded to db!",
      videoId,
    });
  }

  video.status = "uploaded";
  await video.save();
  // 2. Start processing (FFmpeg, etc.)

  return res.json({
    message: "Upload acknowledged",
    videoId,
  });
}

async function getVideo(req, res) {
  try {
    const { videoId } = req.params;

    const video = await Video.findOne({ videoId });
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    if (video.status !== "ready") {
      console.log("Video not ready");
      return res.status(409).json({
        error: "Video is not ready yet",
        status: video.status,
      });
    }
    // Thumbnail signed URL
    // const { data: thumbnailData, error: thumbError } =
    //   await supabase.storage
    //     .from("VideoStream")
    //     .createSignedUrl(video.thumbnailPath, 60);

    // if (thumbError) {
    //   return res.status(404).json({ error: "Thumbnail not found" });
    // }

    // 🔥 MASTER HLS signed URL (THIS IS WHAT PLAYER NEEDS)
    // const { data: hlsData, error: hlsError } =
    //   await supabase.storage
    //     .from("VideoStream")
    //     .createSignedUrl(video.hlsPath, 300);

    // if (hlsError) {
    //   console.log("HLS master not found in storage");
    //   return res.status(404).json({ error: "HLS master not found" });
    // }
    const url =
      "https://kbuudiqccmitqbudeysp.supabase.co/storage/v1/object/public/VideoStream/";
    return res.status(200).json({
      videoId,
      thumbnailUrl: url + video.thumbnailPath, //🔥 DIRECT PATH (NO SIGNED URL)
      hlsUrl: url + video.hlsPath, // ✅ correct key + correct value
    });
  } catch (err) {
    console.error("getVideo failed:", err.message);
    return res.status(500).json({ error: "Failed to fetch video" });
  }
}
// implement rollback in this.
async function deleteVideo(req, res) {
  try {
    const { videoId } = req.params;
    const video = await Video.findOne({ videoId });
    if (!video) {
      return res.status(404).json({ error: "Video not found" });
    }

    const paths = [];
    const qualities = ["360p","480p", "720p", "1080p"];
    
    paths.push(video.storagePath); // raw video path
    paths.push(`processed/${video.videoId}/thumbnail.jpg`);
    paths.push(`processed/${video.videoId}/hls/master.m3u8`);

    for (const quality of qualities) {

       const {data : files, error} = await supabase.storage
       .from("VideoStream")
       .list(`processed/${video.videoId}/hls/${quality}/`);

       if(error){
        console.log(`Quality may not exist or Error listing files for quality ${quality}:`, error);
        continue;
       }

       for(const file of files || []){
          if(file.id){
              console.log(file);
              paths.push(`processed/${video.videoId}/hls/${quality}/${file.name}`);
          }
       }
    }
    
    // Delete all files in paths
    await supabase.storage
      .from("VideoStream")
      .remove(paths);

    const VideoDel = await Video.deleteOne({videoId});
    if(!VideoDel.acknowledged){
      console.log("Failed to delete video metadata from db!");
      return res.status(500).json({error: "Failed to delete video metadata from db!"});
    }

    return res.status(200).json({ message: "Video deleted successfully!" });
  } catch (err) {
    console.log("Something went wrong!", err);
  }
}

export { completeUpload, initUpload, getVideo, deleteVideo };
