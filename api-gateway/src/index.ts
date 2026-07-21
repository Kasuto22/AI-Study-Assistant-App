import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// Create the pg pool with SSL and the 10-second cold-start timeout
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

// Middleware to parse incoming JSON requests
app.use(express.json());

// Authentication route
app.post("/auth/register", async (req, res): Promise<any> => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Email is already in use" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Save new user to database
    const newUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Success response
    res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error("Registration Error:", error);
    res
      .status(500)
      .json({ error: "Internal server error during registration" });
  }
});

// Login endpoint
app.post("/auth/login", async (req, res): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid user or password" });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "24h" },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal server error during login" });
  }
});

// Middleware
//This will be a sort of bouncer for any route that needs the user to be logged in
const authenticateJWT = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): any => {
  // Look for token in the headers
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  // Exctract just the token string
  const token = authHeader.split(" ")[1];

  // Makes sure 'token' is not undefined
  if (!token) {
    return res.status(401).json({ error: "Access denied. Malformed token." });
  }

  try {
    // Verify the token with secret key
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "fallback_secret",
    ) as unknown as { userId: string };

    // Attach the user's ID to the request object so the next function knows who is making the request
    (req as any).userId = decoded.userId;

    // Move to the actual endpoint
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
};

// AI microservice bridge & Database Save
app.post(
  "/api/generate",
  authenticateJWT,
  async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const userId = (req as any).userId;
      const { topic, text, level } = req.body;

      const aiServiceUrl =
        process.env.AI_SERVICE_URL || "http://localhost:8000";

      const aiResponse = await fetch(`${aiServiceUrl}/generate-flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, text, level }),
      });

      // Check if Python service returned an error
      if (!aiResponse.ok) {
        const errorData = await aiResponse.json();
        return res.status(aiResponse.status).json(errorData);
      }

      // Parse the JSON from the AI
      const aiData = await aiResponse.json();
      const generatedCards = aiData.cards;

      if (!generatedCards || generatedCards.length === 0) {
        return res
          .status(500)
          .json({ error: "The AI failed to generate any cards." });
      }

      // Save the new deck and flashcards to PostgreSQL
      const deckTitle = topic ? topic : "Study Notes Deck";

      const newDeck = await prisma.deck.create({
        data: {
          title: deckTitle,
          userId: userId,
          cards: {
            create: generatedCards.map((card: any) => ({
              front: card.front,
              back: card.back,
              // easeFactor, interval, etc. will automatically use the default values we set in schema.prisma
            })),
          },
        },
      });

      // Send the success response to the client
      res.json(newDeck);
    } catch (error) {
      console.error("AI Bridge Error:", error);
      res.status(500).json({
        error: "Failed to communicate with the AI Microservice or save to DB.",
      });
    }
  },
);

// Deck Management Route
// The request must pass the bouncer first
app.post(
  "/api/decks",
  authenticateJWT,
  async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const { title, cards } = req.body;
      const userId = (req as any).userId; // Get this from middleware

      if (!title || !cards || !Array.isArray(cards)) {
        return res
          .status(400)
          .json({ error: "Title and an array of cards are required." });
      }

      // Prisma's "nested create" feature lets us save the deck AND all its cards in one move
      const newDeck = await prisma.deck.create({
        data: {
          title,
          userId,
          cards: {
            create: cards.map((card: { front: string; back: string }) => ({
              front: card.front,
              back: card.back,
            })),
          },
        },
        include: {
          cards: true, // Prisma will only return the newly created cards in the response
        },
      });

      res.status(201).json(newDeck);
    } catch (error) {
      console.error("Save Deck Error:", error);
      res.status(500).json({ error: "Failed to save the deck." });
    }
  },
);

// Fetch all decks for logged in user
app.get(
  "/api/decks",
  authenticateJWT,
  async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      // Get user ID from bouncer
      const userId = (req as any).userId;

      // Ask Prisma for all decks belonging to this user
      const userDecks = await prisma.deck.findMany({
        where: { userId: userId },
        include: {
          cards: true, // Tells Prisma to grab all the flashcards inside each deck
        },
        orderBy: {
          createdAt: "desc", // Sorts newest to oldest
        },
      });

      // Send formatted list back to user
      res.json(userDecks);
    } catch (error) {
      console.error("Fetch Decks Error:", error);
      res.status(500).json({ error: "Failed to fetch decks." });
    }
  },
);

// Update existing flashcard (shoutout Sammy)
app.put(
  "/api/flashcards/:cardId",
  authenticateJWT,
  async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      // Get card ID
      const cardId = req.params.cardId as string;

      // Get new text from the request body
      const { front, back } = req.body;
      const userId = (req as any).userId;

      if (!front && !back) {
        return res.status(400).json({
          error: "Please provide either front or back text to update.",
        });
      }

      // Security Check: Find the card and the deck it belongs to
      const existingCard = await prisma.flashcard.findUnique({
        where: { id: cardId },
        include: { deck: true }, // Need deck info to see who owns it
      });

      if (!existingCard) {
        return res.status(404).json({ error: "Flashcard not found." });
      }

      // Bouncer check
      if (existingCard.deck.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized to edit this flashcard." });
      }

      // If they pass bouncer, do the update
      const updateCard = await prisma.flashcard.update({
        where: { id: cardId },
        data: {
          front: front || existingCard.front,
          back: back || existingCard.back,
        },
      });

      res.json(updateCard);
    } catch (error) {
      console.error("Edit Flashcard Error:", error);
      res.status(500).json({ error: "Failed to update flashcard." });
    }
  },
);

// Submit a study review for flashcard (Spaced Repetition)
app.put(
  "/api/flashcards/:cardId/review",
  authenticateJWT,
  async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const cardId = req.params.cardId as string;
      const userId = (req as any).userId;
      const { score } = req.body; // Score from 1 to 4

      if (score < 1 || score > 4) {
        return res
          .status(400)
          .json({ error: "Score must be between 1 (Forgot) and 4 (Easy)." });
      }

      // Find card and verify ownership
      const card = await prisma.flashcard.findUnique({
        where: { id: cardId },
        include: { deck: true },
      });

      if (!card || card.deck.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized or card not found." });
      }

      // SM-2 Math Variables
      let { easeFactor, interval, reviewCount } = card;

      // Map the 1-4 score to the 0-5 SM-2 quality scale
      // 1(Forgot)->1, 2(Hard)->3, 3(Good)->4, 4(Easy)->5
      let quality = 0;
      if (score === 1) quality = 1;
      if (score === 2) quality = 3;
      if (score === 3) quality = 4;
      if (score === 4) quality = 5;

      // Calculate new interval and review count
      if (quality >= 3) {
        // They remembered it!
        if (reviewCount === 0) {
          interval = 1; // First time remembering? See it tomorrow
        } else if (reviewCount === 1) {
          interval = 6; // Second time? See it in 6 days
        } else {
          // Third time or more? Multiply previous interval by the ease factor
          interval = Math.round(interval * easeFactor);
        }
        reviewCount += 1;
      } else {
        // They forgot it or struggled heavily (Score 1 or 2)
        interval = 1; // Reset to 1 day
        reviewCount = 0; // Reset streak
      }

      // Update the Ease factor based on the SM-2 formula
      easeFactor =
        easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
      if (easeFactor < 1.3) easeFactor = 1.3; // Hard floor: Never let it drop below 1.3

      // Calculate the specific date for next review
      const nextReviewDate = new Date();
      nextReviewDate.setDate(nextReviewDate.getDate() + interval);

      // Save the new memory stats to database
      const updatedCard = await prisma.flashcard.update({
        where: { id: cardId },
        data: {
          easeFactor,
          interval,
          reviewCount,
          nextReview: nextReviewDate,
        },
      });

      res.json({
        message: "Review saved!",
        nextReview: updatedCard.nextReview,
      });
    } catch (error) {
      console.error("Review Flashcard Error:", error);
      res.status(500).json({ error: "Failed to save review." });
    }
  },
);

// Fetch only the flashcards that are due for study in a specific deck
app.get(
  "/api/decks/:deckId/study",
  authenticateJWT,
  async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const deckId = req.params.deckId as string;
      const userId = (req as any).userId;

      // Verify the deck exists and belongs to the user
      const deck = await prisma.deck.findUnique({
        where: { id: deckId },
      });

      if (!deck) {
        return res.status(404).json({ error: "Deck not found." });
      }

      if (deck.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized to access this deck." });
      }

      // Get the exact date and time right now
      const now = new Date();

      // Find all cards in this deck where the nextReview date is in the past (or right now)
      const dueCards = await prisma.flashcard.findMany({
        where: {
          deckId: deckId,
          nextReview: {
            lte: now, // 'lte' means Less Than or Equal To
          },
        },
        orderBy: {
          nextReview: "asc", // Sort by oldest due date first
        },
      });

      res.json(dueCards);
    } catch (error) {
      console.error("Fetch Due Cards Error:", error);
      res.status(500).json({ error: "Failed to fetch due cards." });
    }
  },
);

// Fetch a single deck and all its flashcards
app.get(
  "/api/decks/:deckId",
  authenticateJWT,
  async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const deckId = req.params.deckId as string;
      const userId = (req as any).userId;

      const deck = await prisma.deck.findFirst({
        where: { id: deckId, userId: userId },
        include: {
          cards: true,
        },
      });

      if (!deck) {
        return res.status(404).json({ error: "Deck not found." });
      }

      res.json(deck);
    } catch (error) {
      console.error("Fetch Single Deck Error:", error);
      res.status(500).json({ error: "Failed to fetch deck details." });
    }
  },
);

// Add a single new flashcard to an existing deck
app.post(
  "/api/decks/:deckId/cards",
  authenticateJWT,
  async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const deckId = req.params.deckId as string;
      const { front, back } = req.body;
      const userId = (req as any).userId;

      if (!front || !back) {
        return res
          .status(400)
          .json({ error: "Front and back text are required." });
      }

      // Verify deck exists and the user owns it
      const deck = await prisma.deck.findUnique({
        where: { id: deckId },
      });

      if (!deck) {
        return res.status(404).json({ error: "Deck not found." });
      }

      if (deck.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized to add cards to this deck." });
      }

      // Create the new card and link it to the deck
      const newCard = await prisma.flashcard.create({
        data: {
          front,
          back,
          deckId: deckId,
        },
      });

      res.status(201).json(newCard);
    } catch (error) {
      console.error("Add Card Error:", error);
      res.status(500).json({ error: "Failed to add new flashcard." });
    }
  },
);

// Delete a flashcard
app.delete(
  "/api/flashcards/:cardId",
  authenticateJWT,
  async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const cardId = req.params.cardId as string;
      const userId = (req as any).userId;

      // Find the card and its deck to verify ownership
      const existingCard = await prisma.flashcard.findUnique({
        where: { id: cardId },
        include: { deck: true },
      });

      if (!existingCard) {
        return res.status(404).json({ error: "Flashcard not found." });
      }

      if (existingCard.deck.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized to delete this flashcard." });
      }

      // Delete it
      await prisma.flashcard.delete({
        where: { id: cardId },
      });

      // 200 ok with success message
      res.json({ message: "Flashcard deleted successfully." });
    } catch (error) {
      console.error("Delete Card Error:", error);
      res.status(500).json({ error: "Failed to delete flashcard." });
    }
  },
);

// Delete an entire deck
app.delete(
  "/api/decks/:deckId",
  authenticateJWT,
  async (req: express.Request, res: express.Response): Promise<any> => {
    try {
      const deckId = req.params.deckId as string;
      const userId = (req as any).userId;

      // Verify the deck exists and belongs to the user making the request
      const existingDeck = await prisma.deck.findUnique({
        where: { id: deckId },
      });

      if (!existingDeck) {
        return res.status(404).json({ error: "Deck not found." });
      }

      if (existingDeck.userId !== userId) {
        return res
          .status(403)
          .json({ error: "Unauthorized to delete this deck." });
      }

      // Nuke the deck
      await prisma.deck.delete({
        where: { id: deckId },
      });

      res.json({
        message: "Deck and all associated flashcards deleted successfully.",
      });
    } catch (error) {
      console.error("Delete Deck Error:", error);
      res.status(500).json({ error: "Failed to delete deck." });
    }
  },
);

// Basic Health Check endpoint
app.get("/", (req, res) => {
  res.json({ message: "API Gateway is live and running!" });
});

// Test endpoint to interact with PostgreSQL
app.get("/users", async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
