const express = require("express");
const app = express();
const server = require("http").createServer(app);
const cors = require("cors");
// const ObjectId = require("mongodb").ObjectId;
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const shortid = require("shortid");
const SSLCommerzPayment = require("sslcommerz-lts");
const bodyParser = require("body-parser");
const io = require("socket.io")(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// app.use(cors());

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

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

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
    const serviceCollection = client
      .db("autism_care_network")
      .collection("services");
    const bookingCollection = client
      .db("autism_care_network")
      .collection("bookings");
    const usersCollection = client.db("autism_care_network").collection("user");
    const doctorCollection = client
      .db("autism_care_network")
      .collection("doctors");
    const paymentCollection = client
      .db("autism_care_network")
      .collection("payments");

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

    // admin panel
    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await usersCollection.findOne({
        email: requester,
      });
      if (requesterAccount.role === "admin") {
        next();
      } else {
        res.status(403).send({ message: "forbidden" });
      }
    };

    // app.post('/create-payment-intent', verifyJWT, async(req, res) =>{
    //   const service = req.body;
    //   const price = service.price;
    //   const amount = price*100;
    //   const paymentIntent = await stripe.paymentIntents.create({
    //     amount : amount,
    //     currency: 'usd',
    //     payment_method_types:['card']
    //   });
    //   res.send({clientSecret: paymentIntent.client_secret})
    // });

    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query).project({ name: 1 });
      const services = await cursor.toArray();
      res.send(services);
    });

    app.get("/user", async (req, res) => {
      const users = await usersCollection.find().toArray();
      res.send(users);
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email: email });
      // const isAdmin = user.role === "admin";
      // res.send({ admin: isAdmin });
    });

    app.put("/user/admin/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    // Warning: This is not the proper way to query multiple collection.
    // After learning more about mongodb. use aggregate, lookup, pipeline, match, group
    app.get("/available", async (req, res) => {
      const date = req.query.date;

      // step 1:  get all services
      const services = await serviceCollection.find().toArray();

      // step 2: get the booking of that day. output: [{}, {}, {}, {}, {}, {}]
      const query = { date: date };
      const bookings = await bookingCollection.find(query).toArray();

      // step 3: for each service
      services.forEach((service) => {
        // step 4: find bookings for that service. output: [{}, {}, {}, {}]
        const serviceBookings = bookings.filter(
          (book) => book.treatment === service.name
        );
        // step 5: select slots for the service Bookings: ['', '', '', '']
        const bookedSlots = serviceBookings.map((book) => book.slot);
        // step 6: select those slots that are not in bookedSlots
        const available = service.slots.filter(
          (slot) => !bookedSlots.includes(slot)
        );
        //step 7: set available to slots to make it easier
        service.slots = available;
      });

      res.send(services);
    });

    /**
     * API Naming Convention
     * app.get('/booking') // get all bookings in this collection. or get more than one or by filter
     * app.get('/booking/:id') // get a specific booking
     * app.post('/booking') // add a new booking
     * app.patch('/booking/:id) //
     * app.put('/booking/:id') // upsert ==> update (if exists) or insert (if doesn't exist)
     * app.delete('/booking/:id) //
     */

    app.get("/booking", verifyJWT, async (req, res) => {
      const patient = req.query.patient;
      const decodedEmail = req.decoded.email;
      if (patient === decodedEmail) {
        const query = { patient: patient };
        const bookings = await bookingCollection.find(query).toArray();
        return res.send(bookings);
      } else {
        return res.status(403).send({ message: "forbidden access" });
      }
    });

    app.get("/booking/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingCollection.findOne(query);
      res.send(booking);
    });

    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const query = {
        treatment: booking.treatment,
        date: booking.date,
        patient: booking.patient,
      };
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists });
      }
      const result = await bookingCollection.insertOne(booking);
      console.log("sending email");
      sendAppointmentEmail(booking);
      return res.send({ success: true, result });
    });

    app.patch("/booking/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        },
      };

      const result = await paymentCollection.insertOne(payment);
      const updatedBooking = await bookingCollection.updateOne(
        filter,
        updatedDoc
      );
      res.send(updatedBooking);
    });

    app.get("/doctor", verifyJWT, verifyAdmin, async (req, res) => {
      const doctors = await doctorCollection.find().toArray();
      res.send(doctors);
    });

    app.post("/doctor", verifyJWT, verifyAdmin, async (req, res) => {
      const doctor = req.body;
      const result = await doctorCollection.insertOne(doctor);
      res.send(result);
    });

    app.delete("/doctor/:email", verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const result = await doctorCollection.deleteOne(filter);
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
        success_url: `http://localhost:5000/sslsuccess?transactionId=${transactionId}`,
        fail_url: `http://localhost:5000/sslfailed?transactionId=${transactionId}`,
        cancel_url: `http://localhost:5000/sslcancel?transactionId=${transactionId}`,
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
        ipn_url: "http://localhost:5000/sslcommerz/ssl-payment-notification",
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
      res.redirect(`http://localhost:3000/paymentsuccess/${transactionId}`);
    });

    app.get("/sslsuccess/:transactionId", async (req, res) => {
      const transactionId = req.params.transactionId;
      const query = { tran_id: transactionId };
      const result = await sslcommerSuccessCollection.findOne(query);
      res.send(result);
    });

    app.post("/sslfailed", async (req, res) => {
      const { transactionId } = req.query;

      res.redirect(`http://localhost:3000/paymentfailed/${transactionId}`);
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
