import {Router, Request, Response} from 'express';
import {FeedItem} from '../models/FeedItem';
import {requireAuth} from '../../users/routes/auth.router';
import * as AWS from '../../../../aws';

const router: Router = Router();

// Get all feed items
router.get('/', async (req: Request, res: Response) => {
    const items = await FeedItem.findAndCountAll({order: [['id', 'DESC']]});
    items.rows.map((item) => {
        if (item.url) {
            item.url = AWS.getGetSignedUrl(item.url);
        }
    });
    res.send(items);
});

// GET a specific resource by Primary Key
router.get('/:id',
    requireAuth,
    async (req: Request, res: Response) => {
        const {id} = req.params;
        const item = await FeedItem.findByPk(id);
        if (!item) {
            return res.status(404)
                .send({error: 'This item doesn\'t exist'});
        } else {
            res.send(item);
        }
    });

// update a specific resource
router.patch('/:id',
    requireAuth,
    async (req: Request, res: Response) => {
        const {id} = req.params;
        const feedItem: FeedItem = req.body;

        if (feedItem == null) {
            return res.status(400)
                .send({error: 'body can\'t be empty'});
        }

        if (feedItem.caption || feedItem.url) {
            if (feedItem.id && feedItem.id !== id) {
                return res.status(400)
                    .send({error: 'id in body doesn\'t equal to id in parameters'});
            }
            const item = await FeedItem.findByPk(id)
                .then(feedItemInstance => {
                    if (feedItemInstance) {
                        feedItemInstance.update(feedItem, {
                            where: {id: id}
                        }).then(item1 => {
                            res.status(200)
                                .send(item1);
                        }).catch(error => {
                            res.status(500)
                                .send({error: error});
                        });
                    } else {
                        return res.status(404)
                            .send({error: 'item with this id doesn\'t exist'});
                    }
                }).catch(error => {
                    res.status(500)
                        .send({error: error});
                });
        }
    });

// Get a signed url to put a new item in the bucket
router.get('/signed-url/:fileName',
    requireAuth,
    async (req: Request, res: Response) => {
        const {fileName} = req.params;
        const url = AWS.getPutSignedUrl(fileName);
        res.status(201).send({url: url});
    });

// Post meta data and the filename after a file is uploaded
// NOTE the file name is they key name in the s3 bucket.
// body : {caption: string, fileName: string};
router.post('/',
    requireAuth,
    async (req: Request, res: Response) => {
        const caption = req.body.caption;
        const fileName = req.body.url;

        // check Caption is valid
        if (!caption) {
            return res.status(400).send({message: 'Caption is required or malformed'});
        }

        // check Filename is valid
        if (!fileName) {
            return res.status(400).send({message: 'File url is required'});
        }

        const item = await new FeedItem({
            caption: caption,
            url: fileName
        });

        const saved_item = await item.save();

        saved_item.url = AWS.getGetSignedUrl(saved_item.url);
        res.status(201).send(saved_item);
    });

export const FeedRouter: Router = router;
