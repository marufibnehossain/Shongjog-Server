import express from "express";
import { MongoClient } from 'mongodb';
import 'dotenv/config';
import cors from 'cors';

const app = express();
const client = new MongoClient(process.env.MONGODB_URI);

app.use(cors());
app.use(express.json());

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const mongoClient = await connectToMongoDB();
const db = mongoClient.db("shongjog");
const eventsCollection = db.collection("events");

app.post("/events/create", async (req, res) => {
  try {
    const event = req.body;

    const result = await eventsCollection.insertOne(event);
    console.log(result);
    res.send(result);

    // save event to MongoDB

    res.status(201).json({
      success: true,
      message: "Event added successfully",
      event,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add event",
    });
  }
});

app.get("/events", async (req, res) => {
  const results = await eventsCollection.find({}).toArray();
  res.send(results);
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});