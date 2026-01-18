import fs from "fs";
import path from "path";
import supabase from "../config/supabase.js";
import { probeVideo } from "./ffprobe.js";
import ffmpeg from "./ffmpeg.config.worker.js";


function decideQualities(originalHeight) {
  const AVAILABLE = [1080, 720, 480, 360];
  return AVAILABLE.filter((q) => q <= originalHeight);
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

async function uploadDirectoryToSupabase(localDir, storageBasePath) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });

  for (const entry of entries) {
    const localPath = path.join(localDir, entry.name);
    const storagePath = `${storageBasePath}/${entry.name}`;

    if (entry.isDirectory()) {
      await uploadDirectoryToSupabase(localPath, storagePath);
    } else {
      const buffer = fs.readFileSync(localPath);
      const contentType = entry.name.endsWith(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : "video/MP2T";

      await supabase.storage.from("VideoStream").upload(storagePath, buffer, {
        contentType,
        upsert: true,
      });
    }
  }
}


function ffmpegSafePath(p) {
  return `"${p.replace(/\\/g, "/")}"`;
}

// async function generateHlsRendition(inputPath, outputDir, height) {
//   fs.mkdirSync(outputDir, { recursive: true });

//   const input = inputPath.replace(/\\/g, "/");
//   const segmentPath = path.join(outputDir, "segment_%03d.ts").replace(/\\/g, "/");
//   const playlistPath = path.join(outputDir, "index.m3u8").replace(/\\/g, "/");

//   return new Promise((resolve, reject) => {
//     ffmpeg(input)
//       .outputOptions([
//         "-vf", `scale=-2:${height}`,
//         "-c:a","copy",
//         "-ar", "48000",
//         "-c:v", "libx264",
//         "-profile:v", "main",
//         "-crf", "20",
//         "-sc_threshold", "0",
//         "-g", "60",
//         "-keyint_min", "60",
//         "-hls_time", "4",
//         "-hls_playlist_type", "vod",
//         "-hls_segment_filename", segmentPath,
//       ])
//       .output(playlistPath)
//       .on("start", cmd => console.log("FFMPEG CMD:", cmd))
//       .on("end", resolve)
//       .on("error", reject)
//       .run();
//   });
// }

function generateMasterPlaylist(baseDir, qualities, originalWidth, originalHeight) {
  const lines = ["#EXTM3U"];
  const aspect = originalWidth / originalHeight;
  qualities.forEach((h) => {
    const w = Math.round(h * aspect);
    const bandwidth =
      h === 1080 ? 5000000 :
      h === 720  ? 2800000 :
      h === 480  ? 1400000 :
                   800000;

    lines.push(
      `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${w}x${h}`
    );
    lines.push(`${h}p/index.m3u8`);
  });

  fs.writeFileSync(path.join(baseDir, "master.m3u8"), lines.join("\n"));
}

async function generateHlsRendition(inputPath, outputDir, height) {
  fs.mkdirSync(outputDir, { recursive: true });

  const input = inputPath.replace(/\\/g, "/");

  // FIX: Do NOT use quotes. Instead, escape the spaces with backslashes.
  const segmentPath = path
    .join(outputDir, "segment_%03d.ts")
    .replace(/\\/g, "/")
    .replace(/ /g, "\\ "); // Escape spaces for FFmpeg
  
  const playlistPath = path.join(outputDir, "index.m3u8").replace(/\\/g, "/");

  return new Promise((resolve, reject) => {
    ffmpeg(input)
        .outputOptions([
        "-vf", `scale=-2:${height}`,
        "-c:v", "libx264",
        "-profile:v", "main",
        "-crf", "20",

        "-g", "120",
        "-keyint_min", "120",
        "-sc_threshold", "0",

        "-c:a", "aac",
        "-b:a", "128k",

        "-hls_time", "4",
        "-hls_playlist_type", "vod",
        "-hls_flags", "independent_segments",
        "-hls_segment_filename", segmentPath,
      ])
      .output(playlistPath)
      .on("start", cmd => console.log("FFMPEG CMD:", cmd))
      .on("end", resolve)
      .on("error", reject)
      .run();
  });
}


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
    console.log("download successfull!");

    // Probe video metadata
    const info = await probeVideo(localInputPath);
    console.log(logPrefix, "Video info:", info);

    if (!info.width || !info.height) {
      throw new Error("Invalid video metadata");
    }

    if (info.height < 240 || info.height > 2160) {
      throw new Error("Unsupported video resolution");
    }

    // Decide lower and equal qualities
    const qualities = decideQualities(info.height);
    console.log(logPrefix, "Target qualities:", qualities);

    // Generate thumbnail
    const thumbnailPath = await generateThumbnail(localInputPath, videoDir);
    console.log(logPrefix, "Thumbnail generated");

    // Upload thumbnail to Supabase
    const thumbnailStoragePath = `processed/${video.videoId}/thumbnail.jpg`;
    await uploadToSupabase(thumbnailPath, thumbnailStoragePath, "image/jpeg");

    console.log(logPrefix, "Thumbnail uploaded!");

    // HLS base dir
    const hlsDir = path.join(videoDir, "hls");

    // Generate HLS renditions
    for (const height of qualities) {
      const renditionDir = path.join(hlsDir, `${height}p`);
      await generateHlsRendition(localInputPath, renditionDir, height);
    }

    // Generate master playlist
    generateMasterPlaylist(hlsDir, qualities, info.width, info.height);

    // Upload HLS directory
    const hlsStorageBase = `processed/${video.videoId}/hls`;
    await uploadDirectoryToSupabase(hlsDir, hlsStorageBase);

    const hlsMasterPath = `processed/${video.videoId}/hls/master.m3u8`;
    console.log(logPrefix, "HLS uploaded!");

    // DONE (processing stage)
    return {
      videoId: video.videoId,
      original: info,
      thumbnail: thumbnailStoragePath,
      hlsPath: hlsMasterPath,
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
