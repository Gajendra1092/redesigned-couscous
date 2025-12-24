import supabase from "../config/supabase.js"

async function initUpload(req,res){
    try{
    const {fileName,mimiType} = req.body;
    if(!fileName || !mimiType){
        res.status(400).json("FileName or mimiType is not present!");
    }

    const videoId = uuidv4();

    const filePath = `raw/${videoId}/${fileName}`;

    const {data,error} = await supabase.storage.from(VideoStream).createSignedUploadUrl(filePath,900);

    if(error){
        throw error;
    }

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

  // 1. Verify file exists in storage --> skip
  // 2. Save metadata in DB -->
  
  // 3. Start processing (FFmpeg, etc.)

  res.json({
    message: "Upload acknowledged",
    videoId,
  });
}


async function getVideo(req,res){
    
}


export {
    completeUpload,
    initUpload
}