import { relations, sql } from "drizzle-orm";
import {
  boolean,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

import { apikey } from "./auth";
import { boards, userBoardFavorites } from "./boards";
import { cards } from "./cards";
import { imports } from "./imports";
import { lists } from "./lists";
import { workspaceMembers, workspaces } from "./workspaces";
import { integrations } from "./integrations";

export const users = pgTable("user", {
  id: uuid("id")
    .notNull()
    .primaryKey()
    .default(sql`uuid_generate_v4()`),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: varchar("image", { length: 255 }),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  isDevAccount: boolean("isDevAccount").notNull().default(false),
}).enableRLS();

export const usersRelations = relations(users, ({ many }) => ({
  deletedBoards: many(boards, {
    relationName: "boardDeletedByUser",
  }),
  boards: many(boards, {
    relationName: "boardCreatedByUser",
  }),
  deletedCards: many(cards, {
    relationName: "cardsDeletedByUser",
  }),
  cards: many(cards, {
    relationName: "cardsCreatedByUser",
  }),
  imports: many(imports),
  deletedLists: many(lists, {
    relationName: "listsDeletedByUser",
  }),
  lists: many(lists, {
    relationName: "listsCreatedByUser",
  }),
  deletedWorkspaces: many(workspaces, {
    relationName: "workspaceDeletedByUser",
  }),
  workspaces: many(workspaces, {
    relationName: "workspaceCreatedByUser",
  }),
  memberships: many(workspaceMembers, {
    relationName: "workspaceMembersUser",
  }),
  addedMembers: many(workspaceMembers, {
    relationName: "workspaceMembersAddedByUser",
  }),
  deletedMembers: many(workspaceMembers, {
    relationName: "workspaceMembersDeletedByUser",
  }),
  apiKeys: many(apikey),
  integrations: many(integrations),
}));


export const userBoardFavoritesRelations = relations(userBoardFavorites, ({ one }) => ({
  user: one(users, {
    fields: [userBoardFavorites.userId],
    references: [users.id],
  }),
  board: one(boards, {
    fields: [userBoardFavorites.boardId],
    references: [boards.id],
  }),
}));