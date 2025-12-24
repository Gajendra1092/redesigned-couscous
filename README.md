# Day: 1 Learnings
1. We should configure dotenv at the entry point of the files.
2. Entry point files do not export anything they just run.
3. We can set limit of data on the sender. Here it is 30Kb.
4. Diffrence between app.use and app.post,get......use uses middleware and app.post have final handler in it.
5. Middlewares are the functions which play with the req, tweek it or pass the runtime to other middleware or final handler but do not send response. While final handler sends response.
6. Any function can be both final handler and middleware. for example in if condition i can return response and outside i can just use next() to act as middleware. 
7. Learned how to use Router() to use .route method for an single api end point.
8. changed type in package.json from commonJs to module.
9. We can also encrypt .env file...where it will give public key and private key..
  the dotenvx run command reads from your .env.keys file to decrypt and inject your secrets at runtime.
  ## dotenvx run -- node index.js --> This will read private key from .env.keys file.


# Day: 2 Learnings

1. Frontend upload functionality.
2. How frontend will called the backend.
3. How supabase will work..i am using supabase as a storage not as a db.
4. How to connect to supabase.
5. Cors policies.