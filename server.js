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

app.get("/load", async (req, res) => {
  try {
    const [[resources], [events]] = await Promise.all([
      db.query("SELECT * FROM bryntum_scheduler_resources"),
      db.query("SELECT * FROM bryntum_scheduler_events"),
    ]);
    res.send({
      success: true,
      resources: {
        rows: resources,
      },
      events: {
        rows: events,
      },
    });
  } catch (error) {
    console.error({ error });
    res.send({
      success: false,
      message: "There was an error loading the resources and events data.",
    });
  }
});

// create, update, and delete Bryntum Scheduler events
app.post("/sync", async function (req, res) {
  const { requestId, resources, events } = req.body;
  try {
    const response = { requestId, success: true };
    if (resources) {
      const rows = await applyTableChanges(
        "bryntum_scheduler_resources",
        resources
      );
      // if new data to update client
      if (rows) {
        response.resources = { rows };
      }
    }
    if (events) {
      const rows = await applyTableChanges("bryntum_scheduler_events", events);
      // if new data to update client
      if (rows) {
        response.events = { rows };
      }
    }
    res.send(response);
  } catch (error) {
    console.error({ error });
    res.send({
      requestId,
      success: false,
      message: "There was an error syncing the data.",
    });
  }
});

async function applyTableChanges(table, changes) {
  let rows;
  if (changes.added) {
    rows = await createOperation(changes.added, table);
  }
  if (changes.removed) {
    await deleteOperation(changes.removed, table);
  }
  if (changes.updated) {
    await updateOperation(changes.updated, table);
  }
  // if got some new data to update client
  return rows;
}

function createOperation(added, table) {
  return Promise.all(
    added.map(async (record) => {
      const { $PhantomId, exceptionDates, ...data } = record;
      // insert record
      const [result] = await db.query("INSERT INTO ?? set ?", [
        table,
        table === "bryntum_scheduler_resources"
          ? data
          : {
              ...data,
              exceptionDates: JSON.stringify(exceptionDates),
            },
      ]);
      // report to the client that we changed the record identifier
      return { $PhantomId, id: result.insertId };
    })
  );
}

function deleteOperation(deleted, table) {
  return db.query(
    `DELETE FROM ${table} WHERE id in (?)`,
    deleted.map(({ id }) => id)
  );
}

function updateOperation(updated, table) {
  return Promise.all(
    updated.map(({ id, exceptionDates, ...data }) => {
      return db.query("UPDATE ?? set ? where id = ?", [
        table,
        table === "bryntum_scheduler_resources"
          ? data
          : {
              ...data,
              exceptionDates: JSON.stringify(exceptionDates),
            },
        id,
      ]);
    })
  );
}