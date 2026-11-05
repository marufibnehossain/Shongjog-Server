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

    res.status(201).json({
      success: true,
      message: "Event added successfully",
      event: {
        ...event,
        id: result.insertedId.toString(),
      },
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
  const formattedEvents = results.map((event) => ({
    ...event,
    id: event._id.toString(),
    _id: undefined,
}));
  res.send(formattedEvents);
});

import { ObjectId } from "mongodb";

app.get("/events/:id", async (req, res) => {
    try {
        const { id } = req.params;
        if (!ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid event ID",
            });
        }
        const event = await eventsCollection.findOne({_id: new ObjectId(id),});
        if (!event) {
            return res.status(404).json({
                success: false,
                message: "Event not found",
            });
        }

        const formattedEvent = {
            ...event,
            id: event._id.toString(),
            _id: undefined,
        };

        res.status(200).json(formattedEvent);
    } catch (error) {
        console.error("Error fetching event:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch event",
        });
    }
});

app.patch("/events/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const result = await eventsCollection.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });

  res.json(result);
});

app.delete("/events/:id", async (req, res) => {
  const { id } = req.params;
  const result = await eventsCollection.deleteOne({ _id: new ObjectId(id) });

  res.json(result);
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});