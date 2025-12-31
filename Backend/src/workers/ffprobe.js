import ffmpeg from "./ffmpeg.config.worker.js";

export async function probeVideo(inputPath) {
  try {
    const metadata = await new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, data) => {
        if (err) reject(err);
        else resolve(data);
      });
    });

    const videoStream = metadata.streams.find(
      stream => stream.codec_type === "video"
    );

    if (!videoStream) {
      throw new Error("No video stream found");
    }

    return {
      width: videoStream.width,
      height: videoStream.height,
      bitrate: videoStream.bit_rate
        ? Number(videoStream.bit_rate)
        : null,
      codec: videoStream.codec_name,
      duration: metadata.format.duration,
    };

  } catch (err) {
    console.error("FFprobe failed:", err.message);
    throw err; // let worker decide what to do
  }
}
