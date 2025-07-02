require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@tradeport.i5k2jkx.mongodb.net/?retryWrites=true&w=majority&appName=TradePort`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const admin = require("firebase-admin");

const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf8"
);
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const verifyFireBaseToken = async (req, res, next) => {
  const authHeader = req.headers?.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.decoded = decoded;
    next();
  } catch (error) {
    return res.status(401).send({ message: "Unauthorized access" });
  }
};

const verifyTokenEmail = (req, res, next) => {
  const email = req.headers.email;

  if (email !== req.decoded.email) {
    return res.status(403).send({ message: "Forbidden access" });
  }
  next();
};

async function run() {
  try {
    const productsCollection = client.db("productsDB").collection("products");
    const ordersCollection = client.db("productsDB").collection("orders");

    // Products related apis
    app.get("/products", async (req, res) => {
      const result = await productsCollection.find().toArray();
      res.send(result);
    });

    app.get("/products/category/:category", async (req, res) => {
      const category = req.params.category;

      const query = {
        category: category,
      };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    app.get(
      "/products/:id",
      verifyFireBaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const query = { _id: new ObjectId(req.params.id) };
        const result = await productsCollection.findOne(query);
        res.send(result);
      }
    );

    app.post(
      "/products",
      verifyFireBaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const result = await productsCollection.insertOne(req.body);
        res.send(result);
      }
    );

    app.delete(
      "/products/:id",
      verifyFireBaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const query = { _id: new ObjectId(req.params.id) };

        const result = await productsCollection.deleteOne(query);
        res.send(result);
      }
    );

    app.put(
      "/products/:id",
      verifyFireBaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const filter = { _id: new ObjectId(req.params.id) };

        const options = { upsert: true };

        const updatedProduct = req.body;

        const updateDoc = {
          $set: updatedProduct,
        };

        const result = await productsCollection.updateOne(
          filter,
          updateDoc,
          options
        );
        res.send(result);
      }
    );

    app.patch("/products/:id", async (req, res) => {
      const filter = { _id: new ObjectId(req.params.id) };

      const { quantity, restore } = req.body;

      const updateDoc = {
        $inc: {
          main_quantity: restore ? Math.abs(quantity) : -Math.abs(quantity),
        },
      };
      const result = await productsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // orders related apis
    app.get("/orders", async (req, res) => {
      const result = await ordersCollection.find().toArray();
      res.send(result);
    });

    app.get(
      "/orders/buyer",
      verifyFireBaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const email = req.query.email;

        const query = {
          buyerEmail: email,
        };
        const result = await ordersCollection.find(query).toArray();
        res.send(result);
      }
    );

    app.delete(
      "/orders/:id",
      verifyFireBaseToken,
      verifyTokenEmail,
      async (req, res) => {
        const query = { _id: new ObjectId(req.params.id) };

        const result = await ordersCollection.deleteOne(query);
        res.send(result);
      }
    );

    app.post("/orders", async (req, res) => {
      const result = await ordersCollection.insertOne(req.body);
    });

    app.get("/categories", async (req, res) => {
      const category = req.query.category;

      const query = {
        category: category,
      };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("TradePort Server in cooking!!!");
});

app.listen(port, () => {
  console.log(`TradePort server is running on port http://localhost:${port}`);
});
