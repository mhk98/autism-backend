const express = require("express");
const app = express();
const server = require("http").createServer(app);
const cors = require("cors");
const ObjectId = require("mongodb").ObjectId;
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const shortid = require("shortid");
const SSLCommerzPayment = require("sslcommerz-lts");
const bodyParser = require("body-parser");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

const port = process.env.PORT || 5000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send(
    "<div style='display:flex;height:96vh;justify-content: center;align-items: center;'><h1>Autism Care Server Running!</h1></div>"
  );
});

// const client = new MongoClient(process.env.DB_URL, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// });

// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.y3bgh.mongodb.net/?retryWrites=true&w=majority`;
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.0tfsev7.mongodb.net/?retryWrites=true&w=majority`;
// const client = new MongoClient(uri, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
//   serverApi: ServerApiVersion.v1,
// });

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r3fm7xk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
async function run() {
  try {
    await client.connect();
    // const database = client.db("Autism");
    console.log("database connected");
    // const courseCollection = database.collection("courses");
    // const userCollection = database.collection("users");
    // const sslcommerSuccessCollection = database.collection("success");
    // const sslcommerFailedCollection = database.collection("failed");

    const courseCollection = client
      .db("autism_care_network")
      .collection("courses");
    const userCollection = client.db("autism_care_network").collection("users");
    const profileCollection = client
      .db("autism_care_network")
      .collection("profiles");
    const sslcommerSuccessCollection = client
      .db("autism_care_network")
      .collection("success");
    const sslcommerFailedCollection = client
      .db("autism_care_network")
      .collection("failed");

    io.on("connection", (socket) => {
      socket.emit("me", socket.id);
      console.log("emit me ran");

      socket.on("disconnect", () => {
        socket.broadcast.emit("callended");
      });

      socket.on("calluser", ({ userToCall, signalData, from, name }) => {
        console.log("calluser ran");
        io.to(userToCall).emit("calluser", { signal: signalData, from, name });
        console.log("calluser emitted");
      });

      socket.on("answercall", (data) => {
        io.to(data.to).emit("callaccepted", { signal: data.signal });
        console.log("callaccepted emitted");
      });
    });

    // add course endpoints
    app.post("/course", async (req, res) => {
      const data = req.body;
      const result = await courseCollection.insertOne(data);
      res.json(result);
    });

    app.get("/course", async (req, res) => {
      const result = await courseCollection.find({}).toArray();
      res.send(result);
    });

    app.get("/course/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const course = await courseCollection.findOne(query);
      res.send(course);
    });

    // add users endpoint

    /* user schema
        {
            email:'xyz@gmail.com',
            courses:[]
        } */

    app.post("/users", async (req, res) => {
      const data = req.body;
      const result = await userCollection.insertOne(data);
      res.json(result);
    });

    app.put("/users", async (req, res) => {
      const data = req.body;
      const filter = { email: req.body.email };
      const options = { upsert: true };
      const updateDoc = { $set: data };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      res.json(result);
    });

    app.put("/users/:id", async (req, res) => {
      const data = req.body;
      const filter = { email: req.body.email };
      const updateDoc = { $set: data };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.json(result);
    });

    app.get("/users", async (req, res) => {
      const result = await userCollection.find({}).toArray();
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const course = await userCollection.findOne(query);
      res.send(course);
    });

    app.get("/profile", async (req, res) => {
      const result = await profileCollection.find({}).toArray();
      res.send(result);
    });

    var card_number_local = 0;
    app.post("/sslrequest", async (req, res) => {
      const { amount, card_no } = req.body;
      card_number_local = card_no;
      const transactionId = `${shortid.generate()}`;
      const data = {
        total_amount: amount,
        card_number: card_no,
        currency: "BDT",
        tran_id: transactionId,
        success_url: `https://autism-backend-production.up.railway.app/sslsuccess?transactionId=${transactionId}`,
        fail_url: `https://autism-backend-production.up.railway.app/sslfailed?transactionId=${transactionId}`,
        cancel_url: `https://autism-backend-production.up.railway.app/sslcancel?transactionId=${transactionId}`,
        shipping_method: "No",
        product_name: "device_number.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: "Customer Name",
        cus_email: "cust@yahoo.com",
        cus_add1: "Dhaka",
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        multi_card_name: "mastercard",
        value_a: "ref001_A",
        value_b: "ref002_B",
        // value_c: 'ref003_C',
        value_d: "ref004_D",
        ipn_url:
          "http://localhost:4000/api/v1/sslcommerz/ssl-payment-notification",
      };
      // const sslcommerz = new SSLCommerzPayment(
      //   process.env.STORE_ID,
      //   process.env.STORE_PASSWORD,
      //   false
      // ); //true for live default false for sandbox
      // const result = await sslcommerz.init(data);
      // if (result?.GatewayPageURL) {
      //   return { TranId, GatewayPageURL: result.GatewayPageURL };
      // } else {
      //   return false;
      // }
      const sslcommer = new SSLCommerzPayment(
        process.env.STORE_ID,
        process.env.STORE_PASSWORD,
        false
      ); //true for live default false for sandbox
      const r1 = await sslcommer.init(data);
      return res.status(200).json({
        success: true,
        data: r1,
      });
    });

    // var successData = 0;
    app.post("/sslsuccess", async (req, res) => {
      const { transactionId } = req.query;
      const {
        tran_id,
        val_id,
        amount,
        card_type,
        store_amount,
        card_no,
        bank_tran_id,
        status,
        tran_date,
        currency,
        card_issuer,
        card_brand,
        card_sub_brand,
        card_issuer_country,
        card_issuer_country_code,
        verify_sign,
        currency_type,
        currency_amount,
        currency_rate,
      } = req.body;
      // const data = req.body;
      const result = await sslcommerSuccessCollection
        .insertOne({
          tran_id,
          val_id,
          amount,
          card_type,
          store_amount,
          card_no,
          bank_tran_id,
          status,
          tran_date,
          currency,
          card_issuer,
          card_brand,
          card_sub_brand,
          card_issuer_country,
          card_issuer_country_code,
          verify_sign,
          currency_type,
          currency_amount,
          currency_rate,
        })
        .then((res) => {
          // console.log(res);
        });
      // res.json(result);
      res.redirect(
        `https://effulgent-raindrop-0613dd.netlify.app/paymentsuccess/${transactionId}`
      );
    });

    app.get("/sslsuccess/:transactionId", async (req, res) => {
      const transactionId = req.params.transactionId;
      const query = { tran_id: transactionId };
      const result = await sslcommerSuccessCollection.findOne(query);
      res.send(result);
    });

    app.post("/sslfailed", async (req, res) => {
      const { transactionId } = req.query;

      res.redirect(
        `https://effulgent-raindrop-0613dd.netlify.app/paymentfailed/${transactionId}`
      );
    });

    app.get("/sslfailed/:transactionId", async (req, res) => {
      const transactionId = req.params.transactionId;
      const query = { tran_id: transactionId };
      const result = await sslcommerFailedCollection.findOne(query);
      res.send(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.listen(port, () => console.log(`response from http://localhost:${port}`));
