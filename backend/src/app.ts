import express from "express";

const app = express();

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    message: "Chatbot Builder API is running",
  });
});

export default app;