import { env } from "next-runtime-env";

export const formatToArray = (
  value: string | string[] | undefined,
): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined);
  }
  return value ? [value] : [];
};

export const inferInitialsFromEmail = (email: string) => {
  const localPart = email.split("@")[0];
  if (!localPart) return "";
  const separators = /[._-]/;
  const parts = localPart.split(separators);

  if (parts.length > 1) {
    return (
      (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
    ).toUpperCase();
  } else {
    return localPart.slice(0, 2).toUpperCase();
  }
};

export const getInitialsFromName = (name: string) => {
  return name
    .split(" ")
    .map((namePart) => namePart.charAt(0).toUpperCase())
    .join("");
};

export const formatMemberDisplayName = (
  name: string | null,
  email: string | null,
) => {
  if (name) return name;
  if (!email) return "";

  const localPart = email.split("@")[0];

  if (!localPart) return "";

  return localPart.replace(/[_-]/g, ".");
};

export const getAvatarUrl = (imageOrKey: string | null) => {
  if (!imageOrKey) return "";

  // Already a full URL (e.g. from an OAuth provider like Google/Discord)
  if (imageOrKey.startsWith("http://") || imageOrKey.startsWith("https://")) {
    return imageOrKey;
  }

  // It's an S3 key — build the full URL from env vars
  const storageUrl = env("NEXT_PUBLIC_STORAGE_URL");
  const bucket = env("NEXT_PUBLIC_AVATAR_BUCKET_NAME");
  if (!storageUrl || !bucket) return "";

  const useVirtualHosted =
    env("NEXT_PUBLIC_USE_VIRTUAL_HOSTED_URLS") === "true";
  const storageDomain = env("NEXT_PUBLIC_STORAGE_DOMAIN");

  if (useVirtualHosted && storageDomain) {
    const protocol = storageUrl.startsWith("https") ? "https" : "http";
    return `${protocol}://${bucket}.${storageDomain}/${imageOrKey}`;
  }

  return `${storageUrl}/${bucket}/${imageOrKey}`;
};
