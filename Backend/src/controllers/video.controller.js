import supabase from "../config/supabase.js";
import { v4 as uuidv4 } from "uuid";
import Video from "../models/video.model.js";

async function initUpload(req, res) {
  try {
    const { fileName, mimeType } = req.body;

    if (!fileName || !mimeType) {
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

    // Only allow playback if processing is complete
    if (video.status !== "ready") {
      return res.status(409).json({
        error: "Video is not ready yet",
        status: video.status,
      });
    }

    // Signed URL for thumbnail
    const { data: thumbnailData, error: thumbError } =
      await supabase.storage
        .from("VideoStream")
        .createSignedUrl(video.thumbnailPath, 60);

    if (thumbError) {
      return res.status(404).json({
        error: "Thumbnail not found in storage",
      });
    }

    // Signed URL for original video (We will not use it as orignal video are not optimised for streaming.)
    // const { data: originalData, error: originalError } =
    //   await supabase.storage
    //     .from("VideoStream")
    //     .createSignedUrl(video.storagePath, 60);

    // if (originalError) {
    //   return res.status(404).json({
    //     error: "Original video not found in storage",
    //   });
    // }

    // Signed URLs for all renditions (parallel)
    const signedRenditions = await Promise.all(
      (video.renditions || []).map(async (r) => {
        const { data, error } = await supabase.storage
          .from("VideoStream")
          .createSignedUrl(r.storagePath, 60);

        if (error) {
          throw new Error(`Rendition ${r.height}p not found`);
        }

        return {
          height: r.height,
          url: data.signedUrl,
        };
      })
    );

    return res.status(200).json({
      videoId,
      thumbnailUrl: thumbnailData.signedUrl,
      renditions: signedRenditions,
    });

  } catch (err) {
    console.error("getVideo failed:", err.message);

    return res.status(500).json({
      error: "Failed to fetch video",
    });
  }
}


export { completeUpload, initUpload, getVideo };
