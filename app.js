import bodyParser from "body-parser";
import express from "express";
// import { dirname } from "path";
// const __dirname = dirname(fileURLToPath(import.meta.url));
import * as fs from "fs";
import _ from "lodash";
import mongoose from "mongoose";
import * as date from "./date.js";

const atlasPwd = JSON.parse(fs.readFileSync("./secret.txt")).pwd;

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

// const items = ["Buy Food", "Cook Food", "Eat Food"];
// const workItems = [];

let defaultItems = [];

//NOTE: Database
const itemsSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Please check entry, no name specified!"],
  },
});
const Item = mongoose.model("Item", itemsSchema);

// HACK: LOCAL
// mongoose.connect("mongodb://localhost:27017/todolistDB");
// HACK: PRODUCTION
mongoose.connect(
  `mongodb+srv://ericpython1980:${atlasPwd}@cluster0.epkssdr.mongodb.net/todolistDB?retryWrites=true&w=majority`
);
dbHookup().catch(console.dir);

const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema],
});

const List = mongoose.model("List", listSchema);

//NOTE: Routes
app.get("/favicon.ico", (req, res) => {
  return "./images/dom-js.ico";
});
app.get("/", async function (req, res) {
  const day = date.getDate();
  const existingLists = await List.find();
  await Item.find().then(function (foundItems) {
    // console.log(foundItems);
    res.render("list", {
      listTitle: day,
      newListItems: foundItems,
      lists: existingLists,
    });
  });
});

app.post("/", async function (req, res) {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName,
  });

  if (listName === date.getDate()) {
    item.save();
    res.redirect("/");
  } else {
    await List.findOne({ name: listName })
      .then((foundList) => {
        foundList.items.push(item);
        foundList.save();
        res.redirect("/" + listName);
      })
      .catch(function (error) {
        console.warn(error);
      });
  }
});

// app.get("/work", function (req, res) {
//   res.render("list", { listTitle: "Work List", newListItems: workItems });
// });

app.get("/:customListName", async function (req, res) {
  const customListName = _.capitalize(req.params.customListName);
  const existingLists = await List.find();
  await List.findOne({ name: customListName })
    .then((foundItem) => {
      if (foundItem) {
        res.render("list", {
          listTitle: customListName,
          newListItems: foundItem.items,
          lists: existingLists,
        });
        // console.log("FOUND " + foundItem.name);
      } else {
        const list = new List({
          name: customListName,
          items: defaultItems,
        });
        list.save();
        res.redirect("/" + customListName);
      }
    })
    .catch(function (err) {
      console.log(err);
    });
});

app.post("/delete", async function (req, res) {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === date.getDate()) {
    await Item.findByIdAndRemove(checkedItemId)
      .then((deleted) => {
        console.log(`${deleted._id} deleted`);
        res.redirect("/");
      })
      .catch(function (err) {
        console.log(err);
      });
  } else {
    List.findOneAndUpdate(
      { name: listName },
      { $pull: { items: { _id: checkedItemId } } }
    ).then((foundList) => {
      console.log(foundList.name + " was updated!");
      res.redirect("/" + listName);
    });
  }
});

app.get("/about", function (req, res) {
  res.render("about");
});

app.listen(3000, function () {
  console.log("Server started on port 3000");
});

async function dbHookup() {
  var db = mongoose.connection;
  db.once("open", async function () {
    console.info("Connection Successful!");
  });
  const item1 = new Item({
    name: "Welcome to your todo List!",
  });

  const item2 = new Item({
    name: "hit the + button to add a new item.",
  });
  const item3 = new Item({
    name: "<-- hit this to delete an item.",
  });

  defaultItems = [item1, item2, item3];

  db.once("open", async () => {
    try {
      const cursor = db.db.listCollections();
      for await (const _ of cursor) {
        console.info("Db already configured...");
        return;
      }

      await Item.insertMany(defaultItems)
        .then(() =>
          console.log(
            `Successful insert ${defaultItems.length} items in Items collection`
          )
        )
        .catch(function (err) {
          console.log(err);
        });
    } catch (error) {
      console.warn(err);
    }
  });
}
