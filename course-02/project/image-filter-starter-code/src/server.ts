import express, {Request, Response} from 'express';
import bodyParser from 'body-parser';
import {filterImageFromURL, deleteLocalFiles} from './util/util';

(async () => {

    // Init the Express application
    const app = express();
    // Set the network port
    const port = process.env.PORT || 8082;

    // Use the body parser middleware for post requests
    app.use(bodyParser.json());

    // GET /filteredimage?image_url={{URL}}
    // endpoint to filter an image from a public url.
    // IT SHOULD
    //    1
    //    1. validate the image_url query
    //    2. call filterImageFromURL(image_url) to filter the image
    //    3. send the resulting file in the response
    //    4. deletes any files on the server on finish of the response
    // QUERY PARAMATERS
    //    image_url: URL of a publicly accessible image
    // RETURNS
    //   the filtered image file [!!TIP res.sendFile(filteredpath); might be useful]
    // > try it {{host}}/filteredimage?image_url={{}}
    app.get("/filteredimage/", async (req: Request, res: Response) => {
        let {image_url} = req.query;
        let imgFiles = new Array<string>();

        if (!image_url) {
            return res.status(400)
                .send({'error': `image url is required`});
        }
        await filterImageFromURL(image_url).then(imgPath => {
            if (imgPath === 'error') {
                return res.status(400)
                    .send({'error': `can't read the image url`});
            } else {
                imgFiles.push(imgPath);
                res.sendFile(imgPath);
                deleteImgs(imgFiles);
            }
        });
    });

    async function deleteImgs(imgFiles: Array<string>) {
        await new Promise(resolve => setTimeout(resolve, 1));
        await deleteLocalFiles(imgFiles);
        console.log(`files deleted`);
    }

    // Root Endpoint
    // Displays a simple message to the user
    app.get('/', async (req, res) => {
        res.send('try GET /filteredimage?image_url={{}}')
    });


    // Start the Server
    app.listen(port, () => {
        console.log(`server running http://localhost:${port}`);
        console.log(`press CTRL+C to stop server`);
    });
})();
