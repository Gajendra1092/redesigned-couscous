import { createClient } from "@supabase/supabase-js";
import {SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY} from "../constants.js";

let supabase;
try{
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}
catch(err){
    throw err;
}

export default supabase;
