const express = require('express');
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const admin = require("firebase-admin");
// const { initializeApp } = require('firebase-admin/app');

const app = express();
const port = process.env.PORT || 5000;

// firebase initialize

const serviceAccount = require('./ema-jhon-d7519-firebase-adminsdk-tuz0d-9444956c1c.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// middleware
app.use(cors());
app.use(express.json());

// uri
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.a7zq8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

// create client
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();
        const database = client.db('ema_jhon_online_shop');
        const productCollection = database.collection('products');
        const orderCollection = database.collection('orders');

        //GET Products API
        app.get('/products', async (req, res) => {
            const cursor = productCollection.find({});
            const page = req.query.page;
            const size = parseInt(req.query.size);
            let products;
            const count = await cursor.count();

            if (page) {
                products = await cursor.skip(page * size).limit(size).toArray();
            }
            else {
                products = await cursor.toArray();
            }

            res.send({
                count,
                products
            });
        });


        // verify token
        async function verifyToken(req, res, next) {

            if (req.headers?.authorizetion?.startsWith('Barer ')) {
                const idToken = req.headers.authorizetion.split('Barer ')[1];

                // console.log('this is from',idToken);

                try {
                    const decodedUser = await admin.auth().verifyIdToken(idToken);
                    console.log('hey email is decoded', decodedUser.email);
                    req.decodedUserEmail = decodedUser.email;
                }
                catch {

                }
            }

            next()
        }

        // Use POST to get data by keys
        app.post('/products/byKeys', async (req, res) => {
            const keys = req.body;
            const query = { key: { $in: keys } }
            const products = await productCollection.find(query).toArray();
            res.send(products);
        });

        // Add Orders API
        app.post('/orders', async (req, res) => {
            const order = req.body;
            order.createdAt = new Date();
            const result = await orderCollection.insertOne(order);
            res.json(result);
        })

        // Get all Orders
        app.get('/orders', verifyToken, async (req, res) => {


            // console.log(req.headers.authorizetion); -> barer token_val

            if (req.decodedUserEmail === req.query.email) {
                const email = req.decodedUserEmail;
                const query = { email: email }
                const cursor = orderCollection.find(query);
                const orders = await cursor.toArray();

                res.json(orders);
            }else{
                res.status(401).json('user not authorized');
            }
            

        })

    }
    finally {
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Ema jon server is running');
});

app.listen(port, () => {
    console.log('Server running at port', port);
})