import supabase from "../config/supabase.js"
import { v4 as uuidv4 } from "uuid";
import Video from "../models/video.model.js";


async function initUpload(req,res){
    try{
    const {fileName,mimeType} = req.body;
    
    if(!fileName || !mimeType){
      return res.status(400).json({error:"FileName or mimiType is not present!"});
    }

    const videoId = uuidv4();

    const filePath = `raw/${videoId}/${fileName}`;

    const {data,error} = await supabase.storage.from("VideoStream").createSignedUploadUrl(filePath,900);

    if(error){
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
}
catch(err){
    console.log("initUpload failed due to error: ", err);
    return res.status(500).json({ error: "Failed to init upload" });
}
    
}


async function completeUpload(req, res) {
  const { videoId, filePath } = req.body;

  // 1. Save metadata in DB -->
  const video = await Video.findOne({videoId});
  if(!video){
    console.log("Video's metadata not uploded to db!");
    return res.json({
       message: "Video's metadata is not uploaded to db!",
       videoId
    })
  }

  video.status = "uploaded"
  await video.save();
  // 2. Start processing (FFmpeg, etc.)

  return res.json({
    message: "Upload acknowledged",
    videoId,
  });
}


async function getVideo(req,res){

    const {videoId} = req.params;
    const video = await Video.findOne({videoId});
    if(!video){
        return res.stauts(404).json({error:"Video not found!"});
    }


    console.log(video);

    // return res.status(200).json({message:"Video metadata found!",video});
    // get video from supabase
}


export {
    completeUpload,
    initUpload,
    getVideo
}