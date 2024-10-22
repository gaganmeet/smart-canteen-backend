import { Application, Router, send } from "@oak/oak";
import { cors } from "@momiji/cors";

// Open the KV store
const kv = await Deno.openKv();

// Model functions
async function getAllMenuItems() {
  const menuItems = [];
  for await (const entry of kv.list({ prefix: ["menuItems"] })) {
    menuItems.push(entry.value);
  }
  return menuItems;
}

async function addMenuItem(menuItem) {
  await kv.set(["menuItems", menuItem.id], menuItem);
}

async function getMenuItemById(id) {
  const menuItem = await kv.get(["menuItems", id]);
  return menuItem.value;
}

async function getAllOrders() {
  const orders = [];
  for await (const entry of kv.list({ prefix: ["orders"] })) {
    orders.push(entry.value);
  }
  return orders;
}

async function addOrder(order) {
  await kv.set(["orders", order.id], order);
}

async function getOrderById(id) {
  const order = await kv.get(["orders", id]);
  return order.value;
}

async function updateOrderStatus(id, status) {
  const order = await getOrderById(id);
  if (order) {
    const updatedOrder = { ...order, status };
    await kv.set(["orders", id], updatedOrder);
    return updatedOrder;
  }
  return null;
}

// Controller functions
async function httpGetAllMenuItems(ctx) {
  ctx.response.status = 200;
  ctx.response.body = await getAllMenuItems();
}

async function httpAddMenuItem(ctx) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  const menuItem = await ctx.request.body.json();
  const { name, price, description, imgUrl } = menuItem;

  if (!name || !price || !description || !imgUrl) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Missing required menu item property" };
    return;
  }

  const id = crypto.randomUUID();
  const newMenuItem = { id, name, price, description, imgUrl };
  await addMenuItem(newMenuItem);
  ctx.response.status = 201;
  ctx.response.body = newMenuItem;
}

async function httpGetMenuItem(ctx) {
  const id = ctx.params.id;
  const menuItem = await getMenuItemById(id);
  if (menuItem) {
    ctx.response.body = menuItem;
  } else {
    ctx.response.status = 404;
    ctx.response.body = { error: "Menu item not found" };
  }
}

async function httpGetAllOrders(ctx) {
  ctx.response.status = 200;
  ctx.response.body = await getAllOrders();
}

async function httpAddOrder(ctx) {
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  const order = await ctx.request.body.json();
  const { userId, mobileNumber, items, scheduledTime } = order;

  if (!userId || !mobileNumber || !items || !scheduledTime) {
    ctx.response.status = 400;
    ctx.response.body = { error: "Missing required order property" };
    return;
  }

  const id = crypto.randomUUID();
  const totalPrice = 0; // In a real app, calculate this based on items
  const newOrder = {
    id,
    userId,
    mobileNumber,
    items,
    totalPrice,
    status: "pending",
    scheduledTime,
  };
  await addOrder(newOrder);
  ctx.response.status = 201;
  ctx.response.body = newOrder;
}

async function httpGetOrder(ctx) {
  const id = ctx.params.id;
  const order = await getOrderById(id);
  if (order) {
    ctx.response.body = order;
  } else {
    ctx.response.status = 404;
    ctx.response.body = { error: "Order not found" };
  }
}

async function httpUpdateOrderStatus(ctx) {
  const id = ctx.params.id;
  if (!ctx.request.hasBody) {
    ctx.throw(415);
  }
  const { status } = await ctx.request.body.json();
  const updatedOrder = await updateOrderStatus(id, status);
  if (updatedOrder) {
    ctx.response.body = updatedOrder;
  } else {
    ctx.response.status = 404;
    ctx.response.body = { error: "Order not found" };
  }
}

// Set up the application
const app = new Application();
const router = new Router();

const corsOptions = {
  origin: "*",
};

// Enable CORS
app.use(cors(corsOptions));

// Serve index.html for the root route
router.get("/", async (ctx) => {
  await send(ctx, "index.html", {
    root: `${Deno.cwd()}/`,
  });
});

// Set up routes
router
  .get("/menu", httpGetAllMenuItems)
  .post("/menu", httpAddMenuItem)
  .get("/menu/:id", httpGetMenuItem)
  .get("/orders", httpGetAllOrders)
  .post("/orders", httpAddOrder)
  .get("/orders/:id", httpGetOrder)
  .patch("/orders/:id", httpUpdateOrderStatus);

app.use(router.routes());
app.use(router.allowedMethods());

console.log("Server running on http://localhost:8000");
await app.listen({ port: 8000 });
