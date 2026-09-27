import express from "express";
import { releaseStaleReservations, STOCK_RELEASE_MINUTES } from "../utils/stock.js";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

/**
 * Scheduled maintenance, triggered by Vercel Cron (see vercel.json).
 *
 * Deliberately not an in-process setInterval: this API runs as a serverless
 * function that scales to zero, so a timer registered at module load dies with
 * the container and would only ever fire while the site happened to be busy —
 * exactly when a sweeper is least needed. An external schedule calling an
 * endpoint is the only thing that runs when nobody is on the site.
 *
 * Not an admin route either, because the caller is Vercel rather than a signed-
 * in operator. Vercel attaches `Authorization: Bearer $CRON_SECRET` to every
 * scheduled invocation, and that shared secret is the whole gate — so the route
 * fails closed when it is unset rather than leaving a public endpoint that
 * cancels orders.
 */
const requireCronAuth = (req, res, next) => {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("Cron request refused: CRON_SECRET is not set.");
    return res.status(503).json({ error: "Scheduled jobs are not configured on this server" });
  }

  const provided = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (provided !== secret) {
    console.warn("Cron request refused: bad or missing secret.");
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
};

// GET /api/cron/release-stale-reservations
// Vercel Cron issues a GET, so that is the verb here.
router.get("/release-stale-reservations", requireCronAuth, async (req, res) => {
  try {
    const result = await releaseStaleReservations();

    // Quiet when there is nothing to do — this runs every ten minutes and a
    // line per run would bury the ones that matter.
    if (result.released.length) {
      console.log(
        `🧹 Sweep complete: released ${result.released.length} of ${result.scanned} stale ` +
          `reservation(s) older than ${result.windowMinutes}m.`
      );
    }

    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Stale reservation sweep failed:", error);
    res.status(500).json({ error: "Sweep failed" });
  }
});

// GET /api/cron/health — what the schedule is configured to do, without doing it.
router.get("/health", requireCronAuth, (req, res) => {
  res.json({
    success: true,
    stockReleaseMinutes: STOCK_RELEASE_MINUTES,
  });
});

export default router;
