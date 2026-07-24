import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import ws from "ws";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import crypto from "crypto";
import nodemailer from "nodemailer";

// Tell Neon to use Node's WebSocket implementation
neonConfig.webSocketConstructor = ws;

// Initialize the Neon Adapter
const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL,
});

// Initialize Prisma
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());
const PORT = process.env.PORT || 3000;

// Set up the Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Middleware to parse incoming JSON requests
app.use(express.json());

const DAILY_GENERATION_LIMIT = 20;

// Authentication route
app.post("/auth/register", async (req, res): Promise<any> => {
  try {
    const { email, password } = req.body;

    // Basic validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    // Strict Password Validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.",
      });
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

// Rate limiter configuration
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes window
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: {
    error:
      "Too many login attempts from this IP. Please try again in 15 minutes.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Login endpoint
app.post("/auth/login", loginLimiter, async (req, res): Promise<any> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        error: "Invalid user or password",
      });
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

// Forgot password route
app.post("/auth/forgot-password", async (req, res): Promise<any> => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Don't reveal if the user exists
    if (!user) {
      return res.status(200).json({
        message:
          "If an account with that email exists, a reset link has been sent.",
      });
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Set expiration to 1 hour from now
    const resetTokenExpiry = new Date(Date.now() + 3600000);

    // Save the token and expiry to the user in the database
    await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpiry,
      },
    });

    // Build the reset link
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const resetLink = `${frontendUrl}/auth/reset-password?token=${resetToken}`;

    // Send the email using Nodemailer & Gmail
    try {
      await transporter.sendMail({
        from: `"Flashcard AI" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Reset Your Password - Flashcard AI",
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You recently requested to reset your password. Click the link below to securely change it.</p>
            <a href="${resetLink}" style="display:inline-block;padding:10px 20px;background-color:#2563eb;color:white;text-decoration:none;border-radius:5px;margin-top:10px;">
              Reset Password
            </a>
            <p style="margin-top:20px;font-size:12px;color:gray;">
              If you did not request this, you can safely ignore this email. This link will expire in 1 hour.
            </p>
          </div>
        `,
      });
      console.log(`Reset email sent successfully to ${email}`);
    } catch (emailError) {
      console.error("Nodemailer failed to send:", emailError);
    }

    res.status(200).json({
      message:
        "If an account with that email exists, a reset link has been sent.",
    });

    res.status(200).json({
      message:
        "If an account with that email exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reset password route
app.post("/auth/reset-password", async (req, res): Promise<any> => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res
        .status(400)
        .json({ error: "Token and new password are required" });
    }

    // Backend Validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        error:
          "Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.",
      });
    }

    // Find the user with this token, ensuring it hasn't expired
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the user's password and destroy the tokens so they can't be reused
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    res.status(200).json({ message: "Password has been successfully reset" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Middleware
// This will be a sort of bouncer for any route that needs the user to be logged in
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

  // Extract just the token string
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

      // --- Daily generation limit check ---
      // Protects against a single user (or bot) racking up Gemini API costs.
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const generationsToday = await prisma.deck.count({
        where: {
          userId: userId,
          createdAt: {
            gte: startOfToday,
          },
        },
      });

      if (generationsToday >= DAILY_GENERATION_LIMIT) {
        return res.status(429).json({
          error: `You've reached today's limit of ${DAILY_GENERATION_LIMIT} AI-generated decks. Please try again tomorrow.`,
        });
      }

      // Clean the URL just in case there are accidental spaces or trailing slashes
      let aiServiceUrl = process.env.AI_SERVICE_URL || "http://localhost:8000";
      aiServiceUrl = aiServiceUrl.trim().replace(/\/$/, "");

      const targetEndpoint = `${aiServiceUrl}/generate-flashcards`;

      console.log("SENDING AI REQUEST TO:", targetEndpoint);

      const aiResponse = await fetch(targetEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, text, level }),
      });

      // Check if the response is actually JSON before trying to parse it
      const contentType = aiResponse.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const textResponse = await aiResponse.text();
        console.error(
          "AI Service returned non-JSON:",
          textResponse.substring(0, 100),
        );
        return res.status(502).json({
          error: "Received an invalid response from the AI Microservice.",
        });
      }

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

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
