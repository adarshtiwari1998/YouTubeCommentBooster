import { db } from "./db";
import { users, channels, automationSettings } from "@shared/schema";

async function seed() {
  try {
    console.log("Starting database seeding...");

    // Create default user
    const [defaultUser] = await db.insert(users)
      .values({
        username: "admin",
        password: "admin", // In production, this should be hashed
        youtubeToken: null,
        youtubeRefreshToken: null,
        youtubeChannelId: null,
      })
      .returning()
      .onConflictDoNothing();

    console.log("Default user created:", defaultUser?.username);

    // Create default automation settings
    await db.insert(automationSettings)
      .values({
        isActive: false,
        delayMinutes: 10,
        aiPrompt: "I want to comment on this video as a user in short version. my comment is encouraging others and its a positive impact and it also influence others. Make sure it not look like ai generated look like raw comment",
        maxCommentsPerDay: 100,
        lastRunAt: null,
      })
      .onConflictDoNothing();

    console.log("Default automation settings created");

    // Seed some example channels (optional)
    const defaultChannels = [
      { 
        name: "How To Have Fun Outdoors", 
        handle: "@HowToHaveFunOutdoors", 
        channelId: "UCHowToHaveFunOutdoors",
        totalVideos: 0,
        processedVideos: 0,
        status: "pending",
        isActive: true,
      },
      { 
        name: "How To Have Fun Cruising", 
        handle: "@HowToHaveFunCruising", 
        channelId: "UCHowToHaveFunCruising",
        totalVideos: 0,
        processedVideos: 0,
        status: "pending",
        isActive: true,
      },
      { 
        name: "How To Have Fun Camping", 
        handle: "@howtohavefuncamping", 
        channelId: "UCHowToHaveFunCamping",
        totalVideos: 0,
        processedVideos: 0,
        status: "pending",
        isActive: true,
      },
    ];

    for (const channel of defaultChannels) {
      await db.insert(channels)
        .values(channel)
        .onConflictDoNothing();
    }

    console.log("Default channels seeded");
    console.log("Database seeding completed successfully!");

  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}

// Run if this file is executed directly
seed()
  .then(() => {
    console.log("Seed script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed script failed:", error);
    process.exit(1);
  });

export { seed };