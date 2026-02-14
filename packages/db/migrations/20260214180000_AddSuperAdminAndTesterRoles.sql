-- Add 'super-admin' and 'tester' values to the existing 'role' enum
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'super-admin';--> statement-breakpoint
ALTER TYPE "public"."role" ADD VALUE IF NOT EXISTS 'tester';--> statement-breakpoint

-- Helper function to generate 12-character public IDs
CREATE OR REPLACE FUNCTION generate_public_id() RETURNS varchar(12) AS $$
DECLARE
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  result varchar(12) := '';
  i integer;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;--> statement-breakpoint

-- Seed super-admin system role for each existing workspace
INSERT INTO "workspace_roles" ("publicId", "workspaceId", "name", "description", "hierarchyLevel", "isSystem", "createdAt")
SELECT generate_public_id(), w.id, 'super-admin', 'Full platform control including billing and role management', 200, true, NOW()
FROM "workspace" w
WHERE NOT EXISTS (
  SELECT 1 FROM "workspace_roles" wr 
  WHERE wr."workspaceId" = w.id AND wr."name" = 'super-admin'
);--> statement-breakpoint

-- Seed tester system role for each existing workspace
INSERT INTO "workspace_roles" ("publicId", "workspaceId", "name", "description", "hierarchyLevel", "isSystem", "createdAt")
SELECT generate_public_id(), w.id, 'tester', 'Can create and edit bug reports, test cases, and add comments', 30, true, NOW()
FROM "workspace" w
WHERE NOT EXISTS (
  SELECT 1 FROM "workspace_roles" wr 
  WHERE wr."workspaceId" = w.id AND wr."name" = 'tester'
);--> statement-breakpoint

-- Seed super-admin role permissions (all permissions, same as admin)
INSERT INTO "workspace_role_permissions" ("workspaceRoleId", "permission", "granted", "createdAt")
SELECT wr.id, p.permission, true, NOW()
FROM "workspace_roles" wr
CROSS JOIN (
  VALUES 
    ('workspace:view'), ('workspace:edit'), ('workspace:delete'), ('workspace:manage'),
    ('board:view'), ('board:create'), ('board:edit'), ('board:delete'),
    ('list:view'), ('list:create'), ('list:edit'), ('list:delete'),
    ('card:view'), ('card:create'), ('card:edit'), ('card:delete'),
    ('comment:view'), ('comment:create'), ('comment:edit'), ('comment:delete'),
    ('member:view'), ('member:invite'), ('member:edit'), ('member:remove')
) AS p(permission)
WHERE wr."name" = 'super-admin' AND wr."isSystem" = true
AND NOT EXISTS (
  SELECT 1 FROM "workspace_role_permissions" wrp 
  WHERE wrp."workspaceRoleId" = wr.id AND wrp."permission" = p.permission
);--> statement-breakpoint

-- Seed tester role permissions (view boards/lists/cards, create/edit cards, comments, view members)
INSERT INTO "workspace_role_permissions" ("workspaceRoleId", "permission", "granted", "createdAt")
SELECT wr.id, p.permission, true, NOW()
FROM "workspace_roles" wr
CROSS JOIN (
  VALUES 
    ('workspace:view'),
    ('board:view'),
    ('list:view'),
    ('card:view'), ('card:create'), ('card:edit'),
    ('comment:view'), ('comment:create'), ('comment:edit'),
    ('member:view')
) AS p(permission)
WHERE wr."name" = 'tester' AND wr."isSystem" = true
AND NOT EXISTS (
  SELECT 1 FROM "workspace_role_permissions" wrp 
  WHERE wrp."workspaceRoleId" = wr.id AND wrp."permission" = p.permission
);--> statement-breakpoint

-- Promote existing workspace creators (admins) to super-admin
-- For each workspace, the member who created it (createdBy matches) with admin role becomes super-admin
UPDATE "workspace_members" wm
SET "role" = 'super-admin',
    "roleId" = (
      SELECT wr.id FROM "workspace_roles" wr 
      WHERE wr."workspaceId" = wm."workspaceId" 
      AND wr."name" = 'super-admin'
      LIMIT 1
    )
FROM "workspace" w
WHERE wm."workspaceId" = w.id
  AND wm."userId" = w."createdBy"
  AND wm."role" = 'admin'
  AND wm."deletedAt" IS NULL;--> statement-breakpoint

-- Clean up helper function
DROP FUNCTION IF EXISTS generate_public_id();
