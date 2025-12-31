import fs from "fs";
import path from "path";
import supabase from "../config/supabase.js";
import { probeVideo } from "./ffprobe.js";
import ffmpeg from "./ffmpeg.config.worker.js";

/**
 * Transcode video to a specific height
 * @param {string} inputPath
 * @param {string} outputPath
 * @param {number} height
 */

async function transcodeVideo(inputPath, outputPath, height) {
  console.log(`Transcoding to ${height}p`);

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec("libx264")
      .size(`?x${height}`)
      .outputOptions(["-preset veryfast", "-movflags +faststart"])
      .on("end", resolve)
      .on("error", reject)
      .save(outputPath);
  });

  console.log(`${height}p video created`);
}


//  Decide lower qualities (never upscale)

function decideQualities(originalHeight) {
  const AVAILABLE = [1080, 720, 480, 360];
  return AVAILABLE.filter((q) => q < originalHeight);
}


//  Download raw video from Supabase
export async function downloadFromSupabase(storagePath, outputPath) {
  console.log("Downloading from Supabase:", storagePath);

  const { data, error } = await supabase.storage
    .from("VideoStream")
    .download(storagePath);

  if (error) throw error;

  const buffer = Buffer.from(await data.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);

  console.log("Downloaded to:", outputPath);
}


// Generate thumbnail from video

export async function generateThumbnail(inputPath, outputDir) {
  const thumbnailPath = path.join(outputDir, "thumbnail.jpg");

  await new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .on("end", resolve)
      .on("error", reject)
      .screenshots({
        timestamps: ["5"],
        filename: "thumbnail.jpg",
        folder: outputDir,
        size: "320x?",
      });
  });

  return thumbnailPath;
}


// Upload file to Supabase Storage
 
async function uploadToSupabase(localPath, storagePath, contentType) {
  const fileBuffer = fs.readFileSync(localPath);

  const { error } = await supabase.storage
    .from("VideoStream")
    .upload(storagePath, fileBuffer, {
      contentType,
      upsert: true,
    });

  if (error) throw error;
}

/**
 * Process ONE video from Supabase
 * @param {Object} video - MongoDB video document
 */

export async function processVideo(video) {
  const TEMP_DIR = path.resolve("tmp");
  const videoDir = path.join(TEMP_DIR, video.videoId);
  const logPrefix = `[video:${video.videoId}]`;

  try {
    console.log(logPrefix, "Processing started");

    // Prepare temp workspace
    fs.mkdirSync(videoDir, { recursive: true });
    const localInputPath = path.join(videoDir, "input.mp4");

    // Download raw video
    await downloadFromSupabase(video.storagePath, localInputPath);
    console.log("download successfull!")

    // Probe video metadata
    const info = await probeVideo(localInputPath);
    console.log(logPrefix, "Video info:", info);

    if (!info.width || !info.height) {
      throw new Error("Invalid video metadata");
    }

    if (info.height < 240 || info.height > 2160) {
      throw new Error("Unsupported video resolution");
    }

    // Decide lower qualities
    const qualities = decideQualities(info.height);
    console.log(logPrefix, "Target qualities:", qualities);

    // Generate thumbnail
    const thumbnailPath = await generateThumbnail(localInputPath, videoDir);

    console.log(logPrefix, "Thumbnail generated");

    // Upload thumbnail to Supabase
    const thumbnailStoragePath = `processed/${video.videoId}/thumbnail.jpg`;
    await uploadToSupabase(thumbnailPath, thumbnailStoragePath, "image/jpeg");

    console.log(logPrefix, "Thumbnail uploaded");

    const renditions = [];

    for (const height of qualities) {
      const outputPath = path.join(videoDir, `${height}p.mp4`);
      const storagePath = `processed/${video.videoId}/${height}p.mp4`;

      await transcodeVideo(localInputPath, outputPath, height);

      await uploadToSupabase(outputPath, storagePath, "video/mp4");

      renditions.push({
        height,
        storagePath,
      });
    }

    // DONE (processing stage)
    return {
      videoId: video.videoId,
      original: info,
      thumbnail: thumbnailStoragePath,
      renditions,
    };

  } catch (err) {

    console.error(logPrefix, "Processing failed:", err.message);
    throw err;

  } finally {
    // Cleanup temp files
    try {
      fs.rmSync(videoDir, { recursive: true, force: true });
      console.log(logPrefix, "Temp files cleaned");
    } catch (cleanupErr) {
      console.warn(logPrefix, "Cleanup failed:", cleanupErr.message);
    }
  }
}
