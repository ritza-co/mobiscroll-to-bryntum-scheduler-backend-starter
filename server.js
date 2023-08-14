import cors from "cors";
import express from "express";
import { db } from "./utils/dbConnect.js";
const app = express();

const port = process.env.PORT || 1338;
app.use(express.json());

var corsOptions = {
  origin: process.env.FRONTEND_URL,
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true,
};

app.use(cors(corsOptions));

app.get("/data", async (req, res) => {
  try {
    const [[resources], [events]] = await Promise.all([
      db.query("SELECT * FROM resources"),
      db.query("SELECT * FROM events"),
    ]);
    res.json({
      success: true,
      events,
      resources
    });
  } catch (error) {
    console.log({ error });
    res.json({
      success: false,
      message: "There was an error getting the events",
    });
  }
});

// add event
app.post("/data/event-add", async (req, res) => {
  const event = req.body;
  try {
    const [result] = await db.query(
      "INSERT INTO events(title, tooltip, color, start, end, allDay, recurring, recurringException, recurringExceptionRule, resource, timezone, dragBetweenResources, dragInTime, resize, editable, cssClass) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        event.title,
        event.tooltip,
        event.color,
        new Date(event.start),
        new Date(event.end),
        event.allDay,
        event.recurring,
        event.recurringException,
        event.recurringExceptionRule,
        event.resource,
        event.timezone,
        event.dragBetweenResources,
        event.dragInTime,
        event.resize,
        event.editable,
        event.cssClass,
      ]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.json({
      success: false,
      message: "There was an error adding the event",
    });
  }
});

// delete event
app.post("/data/event-delete/:id", async (req, res) => {
  const sid = req.params.id;
  try {
    await db.query("DELETE FROM events WHERE id = ?", [sid]);
    res.json({ success: true });
  } catch (error) {
    res.json({
      success: false,
      message: "There was an error deleting the event",
    });
  }
});

// update event
app.post("/data/event-update/:id", async (req, res) => {
  const event = req.body;
  const sid = req.params.id;
  try {
    await db.query(
        "UPDATE events SET title = ?, tooltip = ?, color = ?, start = ?," +
          "end = ?, allDay = ?, recurring = ?, recurringException = ?," +
          "recurringExceptionRule = ?, resource = ?, timezone = ?," +
          "dragBetweenResources = ?, dragInTime = ?, resize = ?, editable = ?," +
          "cssClass = ? WHERE id = ?",
        [
          event.title,
          event.tooltip,
          event.color,
          new Date(event.start),
          new Date(event.end),
          event.allDay,
          event.recurring,
          event.recurringException,
          event.recurringExceptionRule,
          event.resource,
          event.timezone,
          event.dragBetweenResources,
          event.dragInTime,
          event.resize,
          event.editable,
          event.cssClass,
          sid,
        ]
      );
    res.json({ success: true });
  } catch (error) {
    console.log({ error });
    res.json({
      success: false,
      message: "There was an error updating the event",
    });
  }
});

app.listen(port, () => {
  console.log(`Started on localhost: ${port}`);
});