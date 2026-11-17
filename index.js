import express from "express";
import { MongoClient } from 'mongodb';
import 'dotenv/config';
import cors from 'cors';
import { ObjectId } from "mongodb";
import { createRemoteJWKSet, jwtVerify } from "jose";

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
const joinedEventsCollection = db.collection("joinedEvents");

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if(!authHeader) {
    return res.status(401).send({msg: "Unauthorized"});
  }

  const token = authHeader.split(" ")[1];

  if(!token) {
    return res.status(401).send({msg: "Unauthorized"});
  }

  const JWKS = createRemoteJWKSet(new URL(process.env.JWKS_URL));

  try{
    const {payload} = await jwtVerify(token, JWKS);
    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).send({msg: "Unauthorized"});
  }
}

app.post("/events/create", verifyToken, async (req, res) => {
  try {
    const event = {
      ...req.body,
      organizerEmail: req.user.email,
    };

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

app.get("/events/upcoming", async (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const limit = parseInt(req.query.limit);

  let query = eventsCollection
    .find({ date: { $gt: today } })
    .sort({ date: 1 });

  if (limit) {
    query = query.limit(limit);
  }

  const result = await query.toArray();

  const events = result.map(({ _id, ...event }) => ({
    ...event,
    id: _id.toString(),
  }));

  res.send(events);
});

app.post("/events/join", verifyToken, async (req, res) => {
  const data = { ...req.body, email: req.user.email };
  const alreadyJoined = await joinedEventsCollection.findOne({
    id: data.id,
    email: data.email,
  });
  if (alreadyJoined) {
    return res.status(400).json({
      message: "You have already joined this event.",
    });
  }
  const result = await joinedEventsCollection.insertOne(data);
  res.send(result);
});

app.get("/events/joined/:email", verifyToken, async (req, res) => {
  const email = req.user.email;
  const results = await joinedEventsCollection.find({ email:email }).sort({ date: 1 }).toArray();
  res.send(results);
});

app.get("/events/joined/check/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const email = req.user.email;

  const joinedEvent = await joinedEventsCollection.findOne({
    id,
    email,
  });

  res.send({
    joined: !!joinedEvent,
  });
});

app.delete("/events/joined/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const email = req.user.email;

  const result = await joinedEventsCollection.deleteOne({
    id,
    email,
  });

  res.send(result);
});

app.get("/events/manage", verifyToken, async (req, res) => {
  const events = await eventsCollection.find({
    organizerEmail: req.user.email,
  }).toArray();

  const formattedEvents = events.map((event) => ({
    ...event,
    id: event._id.toString(),
    _id: undefined,
  }));

  res.send(formattedEvents);
});

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

app.patch("/events/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;
  const result = await eventsCollection.updateOne(
    { 
      _id: new ObjectId(id),
      organizerEmail: req.user.email,
    }, 
    { $set: updatedData });

  res.json(result);
});

app.delete("/events/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const result = await eventsCollection.deleteOne({ _id: new ObjectId(id), organizerEmail: req.user.email });

  res.json(result);
});

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(5000, () => {
  console.log("Server is running on port 5000");
});